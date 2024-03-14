# Recover original images from nextcloud previews

When you find yourself in a situation where you only have downloaded previews from your nextcloud server (e.g. via rightclick -> save as...),
this repo will help you recover the originals behind those previews.

## 1. Prepare data

We'll match the preview images over their hashsums, so the first thing we need is
two lists that map `md5sum -> path` for the selection of previews and all available previews on the server.

### Desired preview hashes

In a directory containing all the desired previews, execute.

```sh
find . -name "*.jpg" -exec md5sum {} > desired-hashes.list \;
```

### All preview hashes

On your server, navigate to your preview directory.
Find your nextcloud data, locate your preview directory in one of the `app_...` dirs.
Inside the preview directory, execute:


```sh
find . -name "*max*" -exec md5sum {} > all-hashes.list \;
```

Copy `all-hashes.list` over to your main machine.

### FileId -> Path mapping

Get the fileId -> filePath mapping from your nextcloud DB. I am using postgres in docker, so it looked like this for me:

```sh
docker exec docker_db_1 psql -U nextcloud -c "COPY (SELECT fileid,path FROM filecache) TO '/tmp/fileid-path-mapping.csv' (FORMAT CSV)"
docker cp docker_db_1 /tmp/fileid-path-mapping.csv .`
```

Copy the `fileid-path-mapping.csv` file over to your main machine.

## 2. Join it all together

On your main machine, gather the generated files. Then execute

```sh
npm install
node index.mjs all-hashes.list desired-hashes.list fileid-path-mapping.csv
```

You will now have a `mapped-everything.awkcompatible`. Copy that to your server.

## 3. Collect all the originals!

On your server, copy all originals together. You need to know which user collected the previews. The users directory will be your `USER_NEXTCLOUD_ROOT`.
For me, it's `USER_NEXTCLOUD_ROOT=nextcloud/{username}/`. Mind the trailing dir separator.

Execute:

```sh
mkdir collected
cat mapped-everything.awkcompatible| awk -F ':' -v q="'" -v rd="$USER_NEXTCLOUD_ROOT" '{ print "cp " q rd$2q" "q"collected/"$1q | "/bin/bash" }'
tar cfv collected-originals.tar collected/*
```

The originals are now in the `collected-originals.tar` archive. Missing files should be reported from `cp`.

## Cleanup

Some files and directories have been created. Clean them up.
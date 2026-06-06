# Backup And Restore

This guide covers the GitHub Actions MongoDB backup workflow and the manual restore process.

## Daily S3 Backup

The repository includes `.github/workflows/mongodb-backup.yml`.

It runs automatically every day at **02:00 Asia/Colombo** and uploads a compressed `mongodump` archive to:

```text
s3://mongodb-database-backup1/mongodb/daily/
```

The workflow can also be run manually from GitHub:

1. Open the repository on GitHub.
2. Go to **Actions**.
3. Select **MongoDB Daily Backup**.
4. Click **Run workflow**.

## Required GitHub Secrets

Set these in GitHub repository settings under **Settings > Secrets and variables > Actions**:

```text
MONGODB_URI
BACKUP_AWS_ACCESS_KEY_ID
BACKUP_AWS_SECRET_ACCESS_KEY
BACKUP_AWS_REGION
```

`BACKUP_AWS_*` should belong to a dedicated IAM user for database backups. The backup workflow intentionally does not fall back to the main app/template S3 secrets, so a missing backup secret fails clearly instead of uploading with the wrong IAM user.

`mongodb-database-backup1` is stored in the workflow as a normal bucket name, not a secret.

## S3 Bucket Requirements

Keep the backup bucket private:

- Block public access enabled.
- Default encryption enabled.
- Versioning recommended.
- Lifecycle rule recommended, for example retain daily backups for 30 or 90 days.

The AWS key used by GitHub Actions should have only the permissions needed for this bucket. Attach this policy to the backup IAM user. It fixes `AccessDenied` errors like:

```text
not authorized to perform: s3:PutObject on resource arn:aws:s3:::mongodb-database-backup1/mongodb/daily/...
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBackupPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::mongodb-database-backup1",
      "Condition": {
        "StringLike": {
          "s3:prefix": "mongodb/daily/*"
        }
      }
    },
    {
      "Sid": "WriteMongoBackupArchives",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:AbortMultipartUpload"
      ],
      "Resource": "arn:aws:s3:::mongodb-database-backup1/mongodb/daily/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

For restore drills, use a separate read-only key or temporarily add:

```json
{
  "Effect": "Allow",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::mongodb-database-backup1/mongodb/daily/*"
}
```

## Verify Backups

After the first workflow run:

1. Open the GitHub Actions run and confirm it completed successfully.
2. Check S3 for a file like:

```text
mongodb/daily/mongodb-YYYY-MM-DD_HH-MM-SS-asia-colombo.archive.gz
```

3. Confirm the object size is greater than zero.

## Restore From S3

Restore should be tested on a staging or temporary database before production.

Download a backup:

```bash
aws s3 cp s3://mongodb-database-backup1/mongodb/daily/mongodb-YYYY-MM-DD_HH-MM-SS-asia-colombo.archive.gz ./restore.archive.gz
```

Restore into a test database first:

```bash
mongorestore --uri "$MONGODB_URI" --archive=./restore.archive.gz --gzip --nsFrom="*" --nsTo="restore_test.*"
```

For production restore, take a fresh backup first and use a maintenance window. To replace matching collections:

```bash
mongorestore --uri "$MONGODB_URI" --archive=./restore.archive.gz --gzip --drop
```

`--drop` deletes matching collections before restoring them. Use it only when you intentionally want the backup to replace current data.

## Restore Checklist

Before production restore:

- Take a fresh current backup.
- Enable maintenance mode or otherwise stop writes.
- Restore to staging and verify users, CV documents, templates, payments, and settings.
- Confirm the selected backup timestamp.

After restore:

- Check `/api/ready`.
- Log in as an admin.
- Verify user list, saved CVs, template settings, billing records, coupons, and app settings.
- Disable maintenance mode after checks pass.

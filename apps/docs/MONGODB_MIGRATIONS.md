# MongoDB Index Migrations

## CV share-slug unique index

The CV document schema uses a partial unique index on `shareSlug`, so only string slugs are subject to uniqueness. Documents without a share link (including legacy documents whose `shareSlug` is `null`) are excluded. The field has no `null` default, so new unshared documents leave it unset.

When deploying this change to a database that already has the old `shareSlug_1` sparse unique index, replace that index once. Run the following in `mongosh` against the same database used by the API, after taking a backup:

```javascript
db.cvdocuments.dropIndex("shareSlug_1");
db.cvdocuments.createIndex(
  { shareSlug: 1 },
  {
    name: "shareSlug_1",
    unique: true,
    partialFilterExpression: { shareSlug: { $type: "string" } }
  }
);
```

The replacement index continues to reject duplicate non-null slugs while allowing any number of unshared documents. If the collection has a different name in your deployment, use that collection instead of `cvdocuments`. If index creation reports duplicate string slugs, resolve those duplicates before retrying; do not remove unique enforcement.

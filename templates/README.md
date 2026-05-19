# S3 PDF Templates

Templates in this directory are synced to `s3://cv-template-bucket/templates` from GitHub Actions on pushes to `main`.

Use this structure for templates that should override the built-in PDF HTML:

```text
templates/
  professional/
    index.html
    style.css
```

Supported placeholders:

```html
{{personalInfo.fullName}}
{{personalInfo.email}}
{{{personalInfo.summary}}}
{{#experience}}
  <h3>{{position}}</h3>
  <p>{{company}}</p>
{{/experience}}
{{^awards}}
  <p>No awards added.</p>
{{/awards}}
```

Double braces are HTML-escaped. Triple braces allow sanitized rich text for fields like summaries and descriptions.

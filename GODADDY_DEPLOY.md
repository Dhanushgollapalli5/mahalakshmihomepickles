# GoDaddy deployment notes

GoDaddy shared hosting usually serves static files only, so a Node/Express backend like this one will not run from the same site path unless you use a supported Node hosting plan or a separate backend host.

## Recommended setup

1. Host the frontend on GoDaddy as a static website.
2. Deploy the Node backend to a host that supports Node.js, such as Render, Railway, Fly.io, or a VPS.
3. Point the frontend at the backend with one of these options:

### Option A: meta tag
Add this to the head of your frontend page:

```html
<meta name="api-base-url" content="https://your-backend-domain.com">
```

### Option B: global override
Before loading the site script, set:

```html
<script>
  window.__MAHA_API_BASE_URL__ = 'https://your-backend-domain.com';
</script>
```

## CORS
Make sure your backend allows the frontend origin in CORS. The current server already allows common origins and can be extended for your GoDaddy domain if needed.

## Important
If the backend is not reachable at the configured URL, the checkout will fall back to offline mode and the order form will not be able to create online payments.

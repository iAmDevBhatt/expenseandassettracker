# npm SSL Fix — Corporate Network

## What Happened

During `npm install`, the following error occurred:

```
npm error code UNABLE_TO_GET_ISSUER_CERT_LOCALLY
npm error errno UNABLE_TO_GET_ISSUER_CERT_LOCALLY
npm error request to https://registry.npmjs.org/... failed, reason: unable to get local issuer certificate
```

## Root Cause

The corporate network uses an **SSL proxy** (man-in-the-middle) that intercepts HTTPS traffic
using the company's own internal certificate. npm does not trust that certificate by default,
so it rejects the connection.

## What Was Changed (and Reverted)

npm stores its global settings in: `C:\Users\<username>\.npmrc`

A temporary workaround of `strict-ssl=false` was applied and then **immediately reverted** to `strict-ssl=true`.

**Current state:** `strict-ssl=true` — certificate verification is enabled. Nothing is broken.
The `node_modules` folder is already on disk, so npm does not need network access for this project.

## Why `strict-ssl=false` Is Risky

Disabling strict-ssl means npm silently accepts **any** SSL certificate, including potentially
malicious ones. This is a real security concern on a corporate network and should not be left disabled.

## Proper Long-Term Fix

Get your company's root CA certificate from IT (a `.crt` or `.pem` file), then run:

```
npm config set cafile "C:\path\to\corporate-cert.pem"
```

This tells npm to trust your company's certificate authority while still verifying all other
certificates normally. No security is sacrificed.

Alternatively, your IT team may have an internal npm mirror or proxy already configured —
ask them for the correct `registry` URL:

```
npm config set registry https://your-internal-npm-mirror/
```

## For Future npm Installs

Until the CA certificate is configured, any new `npm install` on this machine (for any project)
on the corporate network will hit the same error. The fix above is a one-time setup per machine.

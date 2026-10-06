# PageTracker static workspace

Standalone static frontend with bundled fictional analytics and an illustrative replay.
No MySQL, Express server, environment variables or dependency installation is required.

## Local preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
```

Open http://localhost:4173. The login screen appears first. Use the separately supplied workspace credentials.

## Vercel

Import this repository as a new Vercel project, with the repository root as Root Directory.
The included vercel.json selects Other, runs npm run build and publishes public/.
No environment variables are needed.

## Access and data

The login is a browser-side presentation gate using a salted PBKDF2 verifier and tab-scoped session storage.
It is not server authentication. Bundled data, video and the password verifier are public assets.
Never put real customer data or production secrets in this repository. Plaintext passwords are not included.

This export is separate from the dynamic PageTracker service; no backend or production data is included.

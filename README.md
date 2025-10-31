# Home Assistant Web App

This project is a simple JavaScript web app (written in ES5 for compatibility with older devices) served directly from Home Assistant’s `www` directory.  
It can be used for dashboards, control panels, or any interface that interacts with your Home Assistant instance through the API.

---

## Third-Party Libraries

This project uses the following third-party library:

- **[jscolor](http://jscolor.com)** – JavaScript color picker  
  - License: GPLv3 for open source use, or commercial license for commercial use  
  - Author: Jan Odvarko  
  - Usage examples: [http://jscolor.com/examples/](http://jscolor.com/examples/)

---

## Project Structure

```
homeassistant/
└── www/
    └── my_app/
        ├── index.html
        ├── script.js
        ├── config.example.js
        └── README.md
```

---

## Configuration

Before using the app, copy and rename `config.example.js` to `config.js`:

```bash
cp config.example.js config.js
```

Then edit `config.js` and replace the placeholders:

```js
// config.js
window.env = {
  SERVER_URL: "http://192.168.x.x:8123", // your Home Assistant URL
  TOKEN: "your_long_lived_access_token"
};
```

---

## Deployment

To serve the app in Home Assistant, place it in the `www` directory of your Home Assistant configuration folder:

```
/home/homeassistant/.homeassistant/www/
```

After uploading, you can access it in a browser at:

```
http://<YOUR_HASS_IP>:8123/local/my_app/index.html
```

For example:

```
http://192.168.2.28:8123/local/my_app/index.html
```

---

## Usage in Code

Your JavaScript files can access the environment variables like so:

```js
var SERVER_URL = window.env.SERVER_URL;
var TOKEN = window.env.TOKEN;
```

You can then use these to make API requests to Home Assistant.

---

## Security Notes

- Never expose your real `config.js` in GitHub or other public repositories.  
- Always use `.gitignore` to exclude it.  
- Consider using a limited-scope long-lived token.

---

## Troubleshooting

- If changes don’t appear, try **Ctrl+F5** to bypass cache.  
- Ensure your Home Assistant file permissions allow read access to the `www` directory.  
- Use developer tools to check for 404 or CORS errors.

---

## 📜 License

MIT License (or your preferred license)

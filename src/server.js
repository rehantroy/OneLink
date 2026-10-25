const app = require("./app");
const config = require("./config");

function checkGoogleClientId(clientId) {
  if (!clientId) {
    return "GOOGLE_CLIENT_ID is not set in .env";
  }
  if (clientId.startsWith("GOCSPX-")) {
    return "GOOGLE_CLIENT_ID looks like a client SECRET. Use the Client ID instead";
  }
  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    return `GOOGLE_CLIENT_ID "${clientId}" looks like a placeholder. It must end with .apps.googleusercontent.com`;
  }
  return "";
}

const clientIdProblem = checkGoogleClientId(config.googleClientId);
if (clientIdProblem) {
  console.warn(`WARNING: ${clientIdProblem} - Google login will not work`);
}

app.listen(config.port, () => {
  console.log(`OneLink running on http://localhost:${config.port}`);
});

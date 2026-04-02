const fs = require('fs');
const path = require('path');
const { expo } = require('./app.json');

const resolveGoogleServicesFile = () => {
  const envValue = process.env.GOOGLE_SERVICES_JSON;

  if (!envValue) {
    return expo.android.googleServicesFile;
  }

  const trimmed = envValue.trim();

  if (/^\*+$/.test(trimmed)) {
    throw new Error(
      'GOOGLE_SERVICES_JSON is masked. In Expo, add it as a File variable (preferred) or use Sensitive visibility instead of Secret.'
    );
  }

  if (trimmed.startsWith('{')) {
    const generatedPath = path.join(__dirname, '.google-services.generated.json');
    fs.writeFileSync(generatedPath, trimmed, 'utf8');
    return generatedPath;
  }

  return envValue;
};

module.exports = () => ({
  ...expo,
  android: {
    ...expo.android,
    googleServicesFile: resolveGoogleServicesFile(),
  },
});

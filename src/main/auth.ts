import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";
import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const userPool = new CognitoUserPool({
  UserPoolId: "us-west-1_iD3xkKD59",
  ClientId: "4g01ko2i56h93cd5fis0mg07i4",
});

const tokenPath = path.join(app.getPath("userData"), "auth.enc");

function storeTokens(tokens: object) {
  if (!safeStorage.isEncryptionAvailable()) return;
  fs.writeFileSync(
    tokenPath,
    safeStorage.encryptString(JSON.stringify(tokens)),
  );
  console.log("store tokens successful");
}

function loadTokens(): any | null {
  if (!fs.existsSync(tokenPath)) return null;
  console.log("attempt load tokens");
  return JSON.parse(safeStorage.decryptString(fs.readFileSync(tokenPath)));
}

function extractEmailFromIdToken(idToken: string): string {
  const payload = JSON.parse(
    Buffer.from(idToken.split(".")[1], "base64").toString(),
  );
  return normalizeEmail(payload.email);
}

export function signUp(email: string, password: string) {
  return new Promise((resolve, reject) => {
    console.log("signup attempted");
    userPool.signUp(
      normalizeEmail(email),
      password,
      [],
      [],
      (err, result) => {
        if (err) reject(err.message);
        else resolve({ userSub: result!.userSub });
      },
    );
  });
}

export function confirmSignUp(email: string, code: string) {
  const user = new CognitoUser({
    Username: normalizeEmail(email),
    Pool: userPool,
  });
  console.log("confirm signup attempted");
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err, result) => {
      if (err) reject(err.message);
      else resolve(result);
    });
  });
}

export function signIn(email: string, password: string) {
  const normalized = normalizeEmail(email);
  const user = new CognitoUser({ Username: normalized, Pool: userPool });
  const authDetails = new AuthenticationDetails({
    Username: normalized,
    Password: password,
  });
  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        storeTokens({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        });
        console.log("[auth] Signed in:", normalized);
        resolve({ normalized });
      },
      onFailure: (err) => reject(err.message),
    });
  });
}

export function getSession() {
  const tokens = loadTokens();
  console.log("attempt get session tokens");
  if (!tokens) return null;

  const email = extractEmailFromIdToken(tokens.idToken);
  return { email, hasSession: true };
}

export function signOut() {
  if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
  console.log("signout complete");
}

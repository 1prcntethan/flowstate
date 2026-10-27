import "dotenv/config";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { normalizeEmail } from "./auth";
import { todaySessionIdRange } from "../localDay";

const dynamoClient = new DynamoDBClient({
  region: "us-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const db = DynamoDBDocumentClient.from(dynamoClient);

export async function getUserProfile(userId: string) {
  try {
    const res = await db.send(
      new GetCommand({
        TableName: "flowstate-users",
        Key: { userId: normalizeEmail(userId) },
      }),
    );
    return { ok: true, profile: res.Item ?? null };
  } catch (err: any) {
    console.error("[db] getUserProfile failed:", err);
    return { ok: false, error: err.message ?? String(err) };
  }
}

export async function createUserProfile(profile: any) {
  try {
    await db.send(
      new PutCommand({
        TableName: "flowstate-users",
        Item: { ...profile, userId: normalizeEmail(profile.userId) },
      }),
    );
    return { ok: true };
  } catch (err: any) {
    console.error("[db] createUserProfile failed:", err);
    return { ok: false, error: err.message ?? String(err) };
  }
}

export async function updateUserStats({
  userId,
  coinDelta,
  newStreak,
}: any) {
  try {
    await db.send(
      new UpdateCommand({
        TableName: "flowstate-users",
        Key: { userId: normalizeEmail(userId) },
        UpdateExpression: "ADD coins :c SET streak = :s",
        ExpressionAttributeValues: { ":c": coinDelta, ":s": newStreak },
      }),
    );
    return { ok: true };
  } catch (err: any) {
    console.error("[db] updateUserStats failed:", err);
    return { ok: false, error: err.message ?? String(err) };
  }
}

export async function saveSession({ userId, result }: any) {
  try {
    await db.send(
      new PutCommand({
        TableName: "flowstate-sessions",
        Item: {
          userId: normalizeEmail(userId),
          sessionId: `SESSION#${new Date().toISOString()}`,
          ...result,
        },
      }),
    );
    return { ok: true };
  } catch (err: any) {
    console.error("[db] saveSession failed:", err);
    return { ok: false, error: err.message ?? String(err) };
  }
}

export async function getRecentSessions(userId: string, length: number) {
  try {
    const res = await db.send(
      new QueryCommand({
        TableName: "flowstate-sessions",
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": normalizeEmail(userId) },
        ScanIndexForward: false,
        Limit: length,
      }),
    );
    return { ok: true, sessions: res.Items ?? [] };
  } catch (err: any) {
    console.error("[db] getRecentSessions failed:", err);
    return {
      ok: false,
      error: err.message ?? String(err),
      sessions: [] as any[],
    };
  }
}

export async function getTodaySessions(userId: string) {
  const { start, end } = todaySessionIdRange(new Date());
  try {
    const res = await db.send(
      new QueryCommand({
        TableName: "flowstate-sessions",
        KeyConditionExpression:
          "userId = :u AND sessionId BETWEEN :start AND :end",
        ExpressionAttributeValues: {
          ":u": normalizeEmail(userId),
          ":start": start,
          ":end": end,
        },
      }),
    );
    return { ok: true, sessions: res.Items ?? [] };
  } catch (err: any) {
    console.error("[db] getTodaySessions failed:", err);
    return {
      ok: false,
      error: err.message ?? String(err),
      sessions: [] as any[],
    };
  }
}

export async function updateUserSubjects({ userId, subjects }: any) {
  try {
    await db.send(new UpdateCommand({
      TableName: "flowstate-users",
      Key: { userId: normalizeEmail(userId) },
      UpdateExpression: "SET subjects = :s",
      ExpressionAttributeValues: { ":s": subjects },
    }));
    console.log("db updated with new subjects")
    return { ok: true };
  } catch (err: any) {
    console.error("[db] updateUserSubjects failed:", err);
    return { ok: false, error: err.message ?? String(err) };
  }
}

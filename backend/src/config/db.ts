import mongoose from "mongoose";
import Debug from "debug";

const log = Debug("jobintel:db");

let inMemoryServer: any = null;

export async function connectDB(mongoUri?: string) {
  // Try provided URI first
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      log("Connected to MongoDB URI");
      return;
    } catch (err: any) {
      log("Failed to connect with provided MONGODB_URI:", err?.message || err);
      // In production we should not silently fall back to an in-memory DB
      const allowFallback = process.env.USE_INMEM === "true" && process.env.NODE_ENV !== "production";
      if (!allowFallback) throw err;
      log("Falling back to in-memory MongoDB because USE_INMEM=true in a non-production environment.");
    }
  } else {
    if (process.env.NODE_ENV === "production") {
      // In production a MONGODB_URI must be provided
      throw new Error("MONGODB_URI is required in production environment");
    }
  }

  // Start in-memory MongoDB for local dev/testing (only if allowed)
  if (process.env.NODE_ENV === "production" && process.env.USE_INMEM !== "true") {
    throw new Error("Refusing to start in-memory MongoDB in production environment");
  }

  try {
    // lazy import so package is optional
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MongoMemoryServer } = require("mongodb-memory-server");
    inMemoryServer = await MongoMemoryServer.create();
    const uri = inMemoryServer.getUri();
    await mongoose.connect(uri);
    log("Connected to in-memory MongoDB");
  } catch (err) {
    log("Failed to start in-memory MongoDB:", err);
    throw err;
  }
}

export async function stopInMemory() {
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (inMemoryServer) await inMemoryServer.stop();
}

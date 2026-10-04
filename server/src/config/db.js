import mongoose from "mongoose";

let memoryServer;

export async function connectDb() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    await mongoose.connect(uri);
    console.log("MongoDB connected (MONGODB_URI)");
    return;
  }

  const { MongoMemoryServer } = await import("mongodb-memory-server");
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  console.log("MongoDB connected (in-memory, set MONGODB_URI to use a real database)");
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/server.js";
import { pool } from "../src/db.js";

const staff1 = { email: "staff1@coffeeninja.test", password: "Staff@1234" };
const staff2 = { email: "staff2@coffeeninja.test", password: "Staff@1234" };

async function login(creds) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send(creds);
  expect(res.status).toBe(200);
  return agent;
}

let inquiryId;

beforeAll(async () => {
  await pool.query("DELETE FROM inquiries WHERE subject LIKE 'TEST-%'");
});

afterAll(async () => {
  await pool.query("DELETE FROM inquiries WHERE subject LIKE 'TEST-%'");
  await pool.end();
});

describe("inquiries API", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/inquiries");
    expect(res.status).toBe(401);
  });

  it("rejects invalid data with 400 and field errors", async () => {
    const agent = await login(staff1);
    const res = await agent.post("/api/inquiries").send({
      customer_name: "", contact: "x", subject: "", description: "",
    });
    expect(res.status).toBe(400);
    expect(res.body.fields.customer_name).toBeDefined();
  });

  it("creates an inquiry for the signed-in user", async () => {
    const agent = await login(staff1);
    const res = await agent.post("/api/inquiries").send({
      customer_name: "Test Customer",
      contact: "test@example.com",
      subject: "TEST-ownership",
      description: "Created by the automated test",
    });
    expect(res.status).toBe(201);
    expect(res.body.inquiry.status).toBe("New");
    inquiryId = res.body.inquiry.id;
  });

  it("hides another staff member's inquiry with 404", async () => {
    const agent = await login(staff2);
    const res = await agent.get(`/api/inquiries/${inquiryId}`);
    expect(res.status).toBe(404);
  });

  it("rejects an invalid status transition with 409", async () => {
    const agent = await login(staff1);
    const res = await agent
      .patch(`/api/inquiries/${inquiryId}/status`)
      .send({ status: "Resolved", expectedVersion: 1 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("INVALID_TRANSITION");
  });
});
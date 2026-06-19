import { NextResponse } from "next/server";

import {
  AuthenticatedUserConfigurationError,
  AuthenticatedUserError,
} from "./authenticated-user";
import { DatabaseConfigurationError } from "./db";

export function serverErrorResponse(error: unknown) {
  if (error instanceof AuthenticatedUserError) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (error instanceof AuthenticatedUserConfigurationError) {
    return NextResponse.json(
      { error: "authentication-configuration-error" },
      { status: 500 },
    );
  }
  if (error instanceof DatabaseConfigurationError) {
    return NextResponse.json(
      { error: "missing-database-configuration" },
      { status: 500 },
    );
  }
  return NextResponse.json({ error: "database-error" }, { status: 500 });
}

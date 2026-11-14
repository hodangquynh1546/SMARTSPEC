import { bridgeClient } from "../../workhub/domain/bridge.client";
import env from "../../../utils/env";

export type PeerStatus = "ok" | "wrong_password" | "not_found" | "unavailable";
export interface PeerIdentity {
  status: PeerStatus;
  name?: string;
  emailVerified?: boolean;
  passwordChangedAt?: string;
}

/**
 * One account for SmartSpec and WorkHub: the other system is asked (through ForgeBridge) whether an e-mail/password
 * pair is valid there. Used at sign-up and sign-in so an account created in either system works in both, and a
 * password changed in one is picked up by the other the next time it is used.
 */
export const workhubIdentity = {
  /** Passes a password just changed here to WorkHub (best effort; the timestamp guard covers a failure). */
  async setPassword(email: string, password: string): Promise<void> {
    if (!env.WORKHUB_ENABLED) return;
    try {
      await bridgeClient.setIdentityPassword(email, password);
    } catch {
      /* the other system will adopt the new password when it is next used */
    }
  },

  async verify(email: string, password: string): Promise<PeerIdentity> {
    if (!env.WORKHUB_ENABLED) return { status: "unavailable" };
    try {
      return await bridgeClient.verifyIdentity(email, password);
    } catch {
      return { status: "unavailable" }; // never block sign-in because the peer is down
    }
  },
};

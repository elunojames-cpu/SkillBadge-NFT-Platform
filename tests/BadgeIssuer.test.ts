import { describe, it, expect, beforeEach } from "vitest";
import { buffCV, uintCV, principalCV, stringAsciiCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_LEARNER = 101;
const ERR_INVALID_SKILL_HASH = 102;
const ERR_INVALID_METADATA_URI = 103;
const ERR_INVALID_COURSE_ID = 104;
const ERR_BADGE_ALREADY_ISSUED = 105;
const ERR_INVALID_ISSUER = 106;
const ERR_INVALID_EXPIRY = 109;
const ERR_INVALID_LEVEL = 110;
const ERR_INVALID_RARITY = 111;
const ERR_MAX_BADGES_EXCEEDED = 112;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_BADGE_NOT_FOUND = 114;
const ERR_INVALID_CATEGORY = 116;
const ERR_INVALID_DIFFICULTY = 117;
const ERR_INVALID_PREREQ = 118;
const ERR_INVALID_VERSION = 119;
const ERR_INVALID_SCORE = 120;
const ERR_AUTHORITY_NOT_VERIFIED = 108;

interface Badge {
  learner: string;
  skillHash: Uint8Array;
  metadataUri: string;
  courseId: number;
  timestamp: number;
  issuer: string;
  expiry: number;
  level: number;
  rarity: string;
  status: boolean;
  category: string;
  difficulty: number;
  prereqBadgeId: number | null;
  version: number;
  score: number;
}

interface BadgeUpdate {
  updateMetadataUri: string;
  updateExpiry: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class BadgeIssuerMock {
  state: {
    nextBadgeId: number;
    maxBadges: number;
    issuanceFee: number;
    authorityContract: string | null;
    contractOwner: string;
    badges: Map<number, Badge>;
    badgeUpdates: Map<number, BadgeUpdate>;
    badgesBySkillHash: Map<string, number>;
    nftOwners: Map<number, string>;
  } = {
    nextBadgeId: 0,
    maxBadges: 100000,
    issuanceFee: 500,
    authorityContract: null,
    contractOwner: "ST1OWNER",
    badges: new Map(),
    badgeUpdates: new Map(),
    badgesBySkillHash: new Map(),
    nftOwners: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1ISSUER";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextBadgeId: 0,
      maxBadges: 100000,
      issuanceFee: 500,
      authorityContract: null,
      contractOwner: "ST1OWNER",
      badges: new Map(),
      badgeUpdates: new Map(),
      badgesBySkillHash: new Map(),
      nftOwners: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1ISSUER";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (this.caller !== this.state.contractOwner) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.authorityContract !== null) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setIssuanceFee(newFee: number): Result<boolean> {
    if (this.caller !== this.state.contractOwner) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newFee < 0) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    this.state.issuanceFee = newFee;
    return { ok: true, value: true };
  }

  issueBadge(
    learner: string,
    skillHash: Uint8Array,
    metadataUri: string,
    courseId: number,
    expiry: number,
    level: number,
    rarity: string,
    category: string,
    difficulty: number,
    prereqBadgeId: number | null,
    version: number,
    score: number
  ): Result<number> {
    if (this.state.nextBadgeId >= this.state.maxBadges) return { ok: false, value: ERR_MAX_BADGES_EXCEEDED };
    if (learner === "SP000000000000000000002Q6VF78") return { ok: false, value: ERR_INVALID_LEARNER };
    if (skillHash.length !== 32) return { ok: false, value: ERR_INVALID_SKILL_HASH };
    if (!metadataUri || metadataUri.length > 256) return { ok: false, value: ERR_INVALID_METADATA_URI };
    if (courseId <= 0) return { ok: false, value: ERR_INVALID_COURSE_ID };
    if (expiry <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRY };
    if (level <= 0 || level > 10) return { ok: false, value: ERR_INVALID_LEVEL };
    if (!["common", "rare", "epic"].includes(rarity)) return { ok: false, value: ERR_INVALID_RARITY };
    if (!category || category.length > 50) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (difficulty < 1 || difficulty > 5) return { ok: false, value: ERR_INVALID_DIFFICULTY };
    if (prereqBadgeId !== null && !this.state.badges.has(prereqBadgeId)) return { ok: false, value: ERR_INVALID_PREREQ };
    if (version <= 0) return { ok: false, value: ERR_INVALID_VERSION };
    if (score < 0 || score > 100) return { ok: false, value: ERR_INVALID_SCORE };
    const hashKey = Buffer.from(skillHash).toString("hex");
    if (this.state.badgesBySkillHash.has(hashKey)) return { ok: false, value: ERR_BADGE_ALREADY_ISSUED };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.issuanceFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextBadgeId;
    const badge: Badge = {
      learner,
      skillHash,
      metadataUri,
      courseId,
      timestamp: this.blockHeight,
      issuer: this.caller,
      expiry,
      level,
      rarity,
      status: true,
      category,
      difficulty,
      prereqBadgeId,
      version,
      score,
    };
    this.state.badges.set(id, badge);
    this.state.badgesBySkillHash.set(hashKey, id);
    this.state.nftOwners.set(id, learner);
    this.state.nextBadgeId++;
    return { ok: true, value: id };
  }

  getBadge(id: number): Badge | null {
    return this.state.badges.get(id) || null;
  }

  updateBadge(id: number, updateMetadataUri: string, updateExpiry: number): Result<boolean> {
    const badge = this.state.badges.get(id);
    if (!badge) return { ok: false, value: ERR_BADGE_NOT_FOUND };
    if (badge.issuer !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!updateMetadataUri || updateMetadataUri.length > 256) return { ok: false, value: ERR_INVALID_METADATA_URI };
    if (updateExpiry <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRY };

    const updated: Badge = {
      ...badge,
      metadataUri: updateMetadataUri,
      expiry: updateExpiry,
      timestamp: this.blockHeight,
    };
    this.state.badges.set(id, updated);
    this.state.badgeUpdates.set(id, {
      updateMetadataUri,
      updateExpiry,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  transferBadge(id: number, recipient: string): Result<boolean> {
    if (!this.state.nftOwners.has(id)) return { ok: false, value: ERR_BADGE_NOT_FOUND };
    const owner = this.state.nftOwners.get(id)!;
    if (this.caller !== owner) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.nftOwners.set(id, recipient);
    return { ok: true, value: true };
  }

  burnBadge(id: number): Result<boolean> {
    if (!this.state.nftOwners.has(id)) return { ok: false, value: ERR_BADGE_NOT_FOUND };
    const owner = this.state.nftOwners.get(id)!;
    if (this.caller !== owner) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.nftOwners.delete(id);
    this.state.badges.delete(id);
    return { ok: true, value: true };
  }

  getBadgeCount(): Result<number> {
    return { ok: true, value: this.state.nextBadgeId };
  }

  checkBadgeExistence(skillHash: Uint8Array): Result<boolean> {
    const hashKey = Buffer.from(skillHash).toString("hex");
    return { ok: true, value: this.state.badgesBySkillHash.has(hashKey) };
  }
}

describe("BadgeIssuer", () => {
  let contract: BadgeIssuerMock;

  beforeEach(() => {
    contract = new BadgeIssuerMock();
    contract.reset();
  });

  it("issues a badge successfully", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    const result = contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const badge = contract.getBadge(0);
    expect(badge?.learner).toBe("ST3LEARNER");
    expect(badge?.metadataUri).toBe("ipfs://metadata");
    expect(badge?.courseId).toBe(1);
    expect(badge?.expiry).toBe(100000);
    expect(badge?.level).toBe(5);
    expect(badge?.rarity).toBe("rare");
    expect(badge?.category).toBe("programming");
    expect(badge?.difficulty).toBe(3);
    expect(badge?.prereqBadgeId).toBe(null);
    expect(badge?.version).toBe(1);
    expect(badge?.score).toBe(85);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1ISSUER", to: "ST2AUTH" }]);
  });

  it("rejects duplicate skill hash", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    const result = contract.issueBadge(
      "ST4LEARNER",
      skillHash,
      "ipfs://new",
      2,
      200000,
      6,
      "epic",
      "design",
      4,
      0,
      2,
      90
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_BADGE_ALREADY_ISSUED);
  });

  it("rejects issuance without authority contract", () => {
    const skillHash = new Uint8Array(32).fill(1);
    const result = contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid skill hash length", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(31).fill(1);
    const result = contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SKILL_HASH);
  });

  it("rejects invalid level", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    const result = contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      11,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_LEVEL);
  });

  it("rejects invalid rarity", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    const result = contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "legendary",
      "programming",
      3,
      null,
      1,
      85
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_RARITY);
  });

  it("updates a badge successfully", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://old",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    const result = contract.updateBadge(0, "ipfs://new", 200000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const badge = contract.getBadge(0);
    expect(badge?.metadataUri).toBe("ipfs://new");
    expect(badge?.expiry).toBe(200000);
    const update = contract.state.badgeUpdates.get(0);
    expect(update?.updateMetadataUri).toBe("ipfs://new");
    expect(update?.updateExpiry).toBe(200000);
    expect(update?.updater).toBe("ST1ISSUER");
  });

  it("rejects update for non-existent badge", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const result = contract.updateBadge(99, "ipfs://new", 200000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_BADGE_NOT_FOUND);
  });

  it("rejects update by non-issuer", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    contract.caller = "ST4FAKE";
    const result = contract.updateBadge(0, "ipfs://new", 200000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets issuance fee successfully", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    const result = contract.setIssuanceFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.issuanceFee).toBe(1000);
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1ISSUER", to: "ST2AUTH" }]);
  });

  it("rejects issuance fee change by non-owner", () => {
    contract.caller = "ST1ISSUER";
    const result = contract.setIssuanceFee(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("returns correct badge count", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash1 = new Uint8Array(32).fill(1);
    const skillHash2 = new Uint8Array(32).fill(2);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash1,
      "ipfs://metadata1",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    contract.issueBadge(
      "ST4LEARNER",
      skillHash2,
      "ipfs://metadata2",
      2,
      200000,
      6,
      "epic",
      "design",
      4,
      0,
      2,
      90
    );
    const result = contract.getBadgeCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks badge existence correctly", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    const result = contract.checkBadgeExistence(skillHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const fakeHash = new Uint8Array(32).fill(3);
    const result2 = contract.checkBadgeExistence(fakeHash);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("transfers badge successfully", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    contract.caller = "ST3LEARNER";
    const result = contract.transferBadge(0, "ST5NEWOWNER");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.nftOwners.get(0)).toBe("ST5NEWOWNER");
  });

  it("rejects transfer by non-owner", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    contract.caller = "ST4FAKE";
    const result = contract.transferBadge(0, "ST5NEWOWNER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("burns badge successfully", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    contract.caller = "ST3LEARNER";
    const result = contract.burnBadge(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.nftOwners.has(0)).toBe(false);
    expect(contract.state.badges.has(0)).toBe(false);
  });

  it("rejects burn by non-owner", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    contract.caller = "ST4FAKE";
    const result = contract.burnBadge(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects issuance with max badges exceeded", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    contract.state.maxBadges = 1;
    const skillHash1 = new Uint8Array(32).fill(1);
    contract.issueBadge(
      "ST3LEARNER",
      skillHash1,
      "ipfs://metadata1",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      null,
      1,
      85
    );
    const skillHash2 = new Uint8Array(32).fill(2);
    const result = contract.issueBadge(
      "ST4LEARNER",
      skillHash2,
      "ipfs://metadata2",
      2,
      200000,
      6,
      "epic",
      "design",
      4,
      0,
      2,
      90
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_BADGES_EXCEEDED);
  });

  it("rejects invalid prereq", () => {
    contract.caller = "ST1OWNER";
    contract.setAuthorityContract("ST2AUTH");
    contract.caller = "ST1ISSUER";
    const skillHash = new Uint8Array(32).fill(1);
    const result = contract.issueBadge(
      "ST3LEARNER",
      skillHash,
      "ipfs://metadata",
      1,
      100000,
      5,
      "rare",
      "programming",
      3,
      99,
      1,
      85
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PREREQ);
  });
});
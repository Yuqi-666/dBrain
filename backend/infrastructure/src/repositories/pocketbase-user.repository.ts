import type { RecordModel } from "pocketbase";
import type { IUserRepository } from "@workspace/domain/repositories";
import { User, Email } from "@workspace/domain/models/user";
import { PocketBaseClient } from "../database/pocketbase-client";
import { UserMapper } from "../database/mappers/user.mapper";

const COLLECTION_NAME = "users";

interface UserRecord extends RecordModel {
  id: string;
  email: string;
  nickname: string;
  avatar_key: string | null;
  system_config: Record<string, unknown>;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export class PocketBaseUserRepository implements IUserRepository {
  private mapper = new UserMapper();

  constructor(private pb: PocketBaseClient) {}

  private collection() {
    return this.pb.collection<UserRecord>(COLLECTION_NAME);
  }

  async findById(id: string): Promise<User | null> {
    try {
      const record = await this.collection().getOne(id);
      return this.mapper.toDomain(record);
    } catch (error) {
      if (this.pb.isClientResponseError(error) && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      const records = await this.collection().getFirstListItem(
        `email = "${email.value}"`,
      );
      return this.mapper.toDomain(records);
    } catch (error) {
      if (this.pb.isClientResponseError(error) && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async save(user: User): Promise<User> {
    const data = this.mapper.toRecord(user);
    const id = user.id.value;

    let record: UserRecord;
    try {
      const existing = await this.collection().getOne(id);
      record = await this.collection().update(id, data) as UserRecord;
    } catch (error) {
      if (this.pb.isClientResponseError(error) && error.status === 404) {
        record = await this.collection().create(data) as UserRecord;
      } else {
        throw error;
      }
    }
    return this.mapper.toDomain(record);
  }

  async verifyPassword(
    email: Email,
    password: string,
  ): Promise<{ valid: boolean; user: User | null; token?: string }> {
    try {
      const authData = await this.pb.client.collection("users").authWithPassword(
        email.value,
        password,
      );
      const record = authData.record as unknown as UserRecord;
      // PocketBase SDK auto-saves token to authStore after authWithPassword
      const token = this.pb.authStore.token as string | null;
      return { valid: true, user: this.mapper.toDomain(record), token: token ?? undefined };
    } catch (error) {
      if (this.pb.isClientResponseError(error) && error.status === 400) {
        return { valid: false, user: null };
      }
      throw error;
    }
  }

  async createUser(
    email: Email,
    password: string,
    nickname: string,
  ): Promise<User> {
    const username = email.value.split("@")[0];
    try {
      const record = await this.collection().create({
        email: email.value,
        username,
        password,
        passwordConfirm: password,
        nickname,
      }) as UserRecord;
      return this.mapper.toDomain(record);
    } catch (error) {
      if (error instanceof Error) {
        console.error("PocketBase createUser error:", error.message);
      }
      throw error;
    }
  }
}

import type { RecordModel } from "pocketbase";

import type { INodeSemanticRepository } from "@workspace/domain/repositories";
import { NodeSemantic } from "@workspace/domain/models/semantic/entities";
import type { SemanticId } from "@workspace/domain/models/semantic/value-objects";
import { NodeSemanticMapper } from "../database/mappers/node-semantic.mapper";
import { PocketBaseClient } from "../database/pocketbase-client";

const COLLECTION_NAME = "node_semantics";

export class PocketBaseNodeSemanticRepository implements INodeSemanticRepository {
  private readonly mapper: NodeSemanticMapper;

  constructor(private pb: PocketBaseClient) {
    this.mapper = new NodeSemanticMapper();
  }

  private collection() {
    return this.pb.collection<NodeSemanticRecord>(COLLECTION_NAME);
  }

  async findById(id: SemanticId): Promise<NodeSemantic | null> {
    try {
      const record = await this.collection().getOne(id.getValue());
      return this.mapper.toDomain(record);
    } catch (error) {
      if (this.pb.isClientResponseError(error) && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async save(semantic: NodeSemantic): Promise<NodeSemantic> {
    const data = this.mapper.toRecord(semantic);
    const id = semantic.id.getValue();

    if (id) {
      const record = await this.collection().update(id, data);
      return this.mapper.toDomain(record);
    } else {
      const record = await this.collection().create(data);
      return this.mapper.toDomain(record);
    }
  }

  async delete(id: SemanticId): Promise<void> {
    await this.collection().delete(id.getValue());
  }

  async findAll(): Promise<NodeSemantic[]> {
    const records = await this.collection().getFullList();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findByName(name: string): Promise<NodeSemantic | null> {
    try {
      const records = await this.collection().getFullList({
        filter: `name = "${name}"`,
      });
      const firstRecord = records[0];
      if (!firstRecord) {
        return null;
      }
      return this.mapper.toDomain(firstRecord);
    } catch {
      return null;
    }
  }

  async findByColor(color: string): Promise<NodeSemantic[]> {
    const records = await this.collection().getFullList({
      filter: `color = "${color}"`,
    });
    return records.map((record) => this.mapper.toDomain(record));
  }
}

interface NodeSemanticRecord extends RecordModel {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}
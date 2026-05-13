import type { RecordModel } from "pocketbase";
import { NodeTag } from "@workspace/domain/models/semantic/entities";
import type { TagId } from "@workspace/domain/models/semantic/value-objects";
import type { INodeTagRepository } from "@workspace/domain/repositories";
import { NodeTagMapper } from "../database/mappers/node-tag.mapper";
import { getPocketBaseClient } from "../database/pocketbase-client";

const COLLECTION_NAME = "node_tags";

export class PocketBaseNodeTagRepository implements INodeTagRepository {
  private get collection() {
    return getPocketBaseClient().collection<RecordModel>(COLLECTION_NAME);
  }

  private get mapper(): NodeTagMapper {
    return new NodeTagMapper();
  }

  async findById(id: TagId): Promise<NodeTag | null> {
    try {
      const record = await this.collection.getOne(id.getValue());
      return this.mapper.toDomain(record);
    } catch (error) {
      const pb = getPocketBaseClient();
      if (pb.isClientResponseError(error) && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async save(tag: NodeTag): Promise<NodeTag> {
    const data = this.mapper.toRecord(tag);
    const id = tag.id.getValue();

    let record: RecordModel;
    try {
      await this.collection.getOne(id);
      record = await this.collection.update(id, data);
    } catch (error) {
      const pb = getPocketBaseClient();
      if (pb.isClientResponseError(error) && error.status === 404) {
        record = await this.collection.create(data);
      } else {
        throw error;
      }
    }

    return this.mapper.toDomain(record);
  }

  async delete(id: TagId): Promise<void> {
    await this.collection.delete(id.getValue());
  }

  async findAll(): Promise<NodeTag[]> {
    const records = await this.collection.getFullList();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findByName(name: string): Promise<NodeTag | null> {
    try {
      const record = await this.collection.getFirstListItem(`name="${name}"`);
      return this.mapper.toDomain(record);
    } catch (error) {
      const pb = getPocketBaseClient();
      if (pb.isClientResponseError(error) && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async findByIds(ids: TagId[]): Promise<NodeTag[]> {
    if (ids.length === 0) {
      return [];
    }

    const idValues = ids.map((id) => id.getValue());
    const filter = `id ?= "${idValues.join('" || id ?= "')}"`;

    const result = await this.collection.getList(1, ids.length, {
      filter,
    });

    const tagMap = new Map(
      result.items.map((record) => [record.id, this.mapper.toDomain(record)]),
    );

    return ids
      .map((id) => tagMap.get(id.getValue()))
      .filter((tag): tag is NodeTag => tag !== undefined);
  }
}
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AddressRepositoryPort } from "@quickcart/domain";
import type { Address, UpsertAddressInput } from "@quickcart/contracts";
import { ADDRESS_REPOSITORY } from "./addresses.tokens.js";

/**
 * CRUD over saved addresses (Doc 06 checkout needs a *saved* address, not a bare text field —
 * see the plan's Phase 3 note). Orders never hold a live reference to these; checkout
 * snapshots the chosen one (see `orders` module, Phase 4).
 */
@Injectable()
export class AddressesService {
  constructor(@Inject(ADDRESS_REPOSITORY) private readonly addresses: AddressRepositoryPort) {}

  list(userId: string): Promise<Address[]> {
    return this.addresses.listByUser(userId);
  }

  create(userId: string, input: UpsertAddressInput): Promise<Address> {
    return this.addresses.create(userId, input);
  }

  async update(userId: string, id: string, input: UpsertAddressInput): Promise<Address> {
    await this.assertOwned(userId, id);
    const updated = await this.addresses.update(id, input);
    if (!updated) throw new NotFoundException({ error: "address_not_found" });
    return updated;
  }

  async delete(userId: string, id: string): Promise<{ deleted: true }> {
    await this.assertOwned(userId, id);
    await this.addresses.delete(id);
    return { deleted: true };
  }

  async setDefault(userId: string, id: string): Promise<Address> {
    await this.assertOwned(userId, id);
    const updated = await this.addresses.setDefault(userId, id);
    if (!updated) throw new NotFoundException({ error: "address_not_found" });
    return updated;
  }

  getDefault(userId: string): Promise<Address | null> {
    return this.addresses.getDefault(userId);
  }

  async getOwned(userId: string, id: string): Promise<Address> {
    return this.assertOwned(userId, id);
  }

  private async assertOwned(userId: string, id: string): Promise<Address> {
    const address = await this.addresses.findById(id);
    if (!address || address.userId !== userId) throw new NotFoundException({ error: "address_not_found" });
    return address;
  }
}

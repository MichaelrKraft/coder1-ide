/**
 * Go High Level Integration for Premium Backend
 * Handles email automation, contact management, and workflow triggers
 */

import axios from 'axios';

export interface GHLContact {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  source?: string;
}

export interface GHLWorkflowTrigger {
  contactId: string;
  workflowId: string;
  metadata?: Record<string, any>;
}

export interface GHLEmailData {
  contactId: string;
  subject?: string;
  content?: string;
  metadata?: Record<string, any>;
}

class GHLService {
  private apiKey: string | undefined;
  private locationId: string | undefined;
  private baseUrl = 'https://services.leadconnectorhq.com';
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.apiKey = process.env.GHL_API_KEY;
    this.locationId = process.env.GHL_LOCATION_ID;

    if (!this.apiKey || !this.locationId) {
      console.warn('⚠️ GHL not configured. Set GHL_API_KEY and GHL_LOCATION_ID to enable email automation.');
      this.isInitialized = false;
      return;
    }

    this.isInitialized = true;
    console.log('✅ GoHighLevel service initialized successfully');
  }

  /**
   * Check if GHL is configured and ready
   */
  isReady(): boolean {
    return this.isInitialized && !!this.apiKey && !!this.locationId;
  }

  /**
   * Create or update a contact
   */
  async upsertContact(contact: GHLContact): Promise<string | null> {
    if (!this.isReady()) {
      console.warn('GHL not initialized. Skipping contact upsert.');
      return null;
    }

    try {
      // Check if contact exists
      const existingContact = await this.getContactByEmail(contact.email);

      if (existingContact?.id) {
        // Update existing
        await axios.put(
          `${this.baseUrl}/contacts/${existingContact.id}`,
          {
            email: contact.email,
            name: contact.name,
            phone: contact.phone,
            firstName: contact.firstName,
            lastName: contact.lastName,
            tags: contact.tags,
            customFields: contact.customFields,
            source: contact.source || 'Coder1 Premium',
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log(`✅ Updated GHL contact: ${existingContact.id}`);
        return existingContact.id;
      } else {
        // Create new
        const response = await axios.post(
          `${this.baseUrl}/contacts`,
          {
            locationId: this.locationId,
            email: contact.email,
            name: contact.name,
            phone: contact.phone,
            firstName: contact.firstName,
            lastName: contact.lastName,
            tags: contact.tags || ['Coder1 Premium User'],
            customFields: contact.customFields,
            source: contact.source || 'Coder1 Premium',
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log(`✅ Created new GHL contact: ${response.data.contact.id}`);
        return response.data.contact.id;
      }
    } catch (error) {
      console.error('❌ Failed to upsert GHL contact:', error);
      return null;
    }
  }

  /**
   * Get contact by email
   */
  async getContactByEmail(email: string): Promise<GHLContact | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/contacts/search`, {
        params: {
          locationId: this.locationId,
          query: email,
        },
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.data.contacts && response.data.contacts.length > 0) {
        const contact = response.data.contacts[0];
        return {
          id: contact.id,
          email: contact.email,
          name: contact.name,
          phone: contact.phone,
          firstName: contact.firstName,
          lastName: contact.lastName,
          tags: contact.tags,
          customFields: contact.customFields,
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get GHL contact by email:', error);
      return null;
    }
  }

  /**
   * Trigger a workflow for a contact
   */
  async triggerWorkflow(contactId: string, workflowId: string, metadata?: any): Promise<boolean> {
    if (!this.isReady()) {
      console.warn('GHL not initialized. Skipping workflow trigger.');
      return false;
    }

    try {
      await axios.post(
        `${this.baseUrl}/workflows/${workflowId}/contacts`,
        {
          contactId,
          eventData: metadata || {},
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ Triggered GHL workflow ${workflowId} for contact ${contactId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to trigger GHL workflow:', error);
      return false;
    }
  }

  /**
   * Add tags to a contact
   */
  async addContactTags(contactId: string, tags: string[]): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await axios.put(
        `${this.baseUrl}/contacts/${contactId}`,
        { tags },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ Added tags to contact ${contactId}: ${tags.join(', ')}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to add GHL contact tags:', error);
      return false;
    }
  }

  /**
   * Create a note on contact
   */
  async createContactNote(contactId: string, note: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await axios.post(
        `${this.baseUrl}/contacts/${contactId}/notes`,
        {
          body: note,
          userId: 'system',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ Created note for contact ${contactId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to create GHL contact note:', error);
      return false;
    }
  }
}

export const ghlService = new GHLService();
export default ghlService;

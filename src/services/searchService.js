const { MeiliSearch } = require('meilisearch');
const { logger } = require('../middleware/logger');

class SearchService {
  constructor() {
    this.client = new MeiliSearch({
      host: process.env.MEILI_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILI_MASTER_KEY
    });
  }

  async initIndex(indexName, settings) {
    try {
      await this.client.createIndex(indexName, { primaryKey: 'id' });
      logger.info(`Meilisearch index "${indexName}" created.`);
    } catch (error) {
      if (error.code !== 'index_already_exists') {
        throw error;
      }
      logger.info(`Meilisearch index "${indexName}" already exists.`);
    }
    await this.client.index(indexName).updateSettings(settings);
    logger.info(`Meilisearch index "${indexName}" is configured and ready.`);
  }

  async addOrUpdateDocuments(indexName, documents) {
    if (!Array.isArray(documents) || documents.length === 0) return;
    try {
      await this.client.index(indexName).addDocuments(documents);
    } catch (error) {
      logger.error(`Error adding/updating documents in Meilisearch index "${indexName}":`, error);
      throw error;
    }
  }

  async deleteDocument(indexName, documentId) {
    try {
      await this.client.index(indexName).deleteDocument(documentId);
    } catch (error) {
      logger.error(`Error deleting document from Meilisearch index "${indexName}":`, error);
      throw error;
    }
  }

  async search(indexName, query, options = {}) {
    const {
      filters, limit = 20, offset = 0, sort
    } = options;
    try {
      const searchParams = {
        limit, offset, filter: filters, sort
      };
      return await this.client.index(indexName).search(query, searchParams);
    } catch (error) {
      logger.error(`Error searching in Meilisearch index "${indexName}":`, error);
      throw error;
    }
  }
}

module.exports = new SearchService();

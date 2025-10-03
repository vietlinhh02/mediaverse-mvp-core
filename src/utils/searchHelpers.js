/**
 * Helper functions for search operations
 */

/**
 * Map sortBy parameter to MeiliSearch sort format
 * @param {string} sortBy - Sort type (relevance, recent, popular)
 * @returns {Array<string>|undefined} - MeiliSearch sort array or undefined for relevance
 */
function mapSortByToMeiliSearch(sortBy) {
  const sortMap = {
    // Relevance is the default MeiliSearch ranking, no sort needed
    relevance: undefined,
    
    // Recent: sort by creation date descending
    recent: ['createdAt:desc'],
    
    // Popular: MeiliSearch doesn't have built-in popularity ranking
    // We'll need to add a popularity score field or use a custom ranking rule
    // For now, sort by creation date as fallback
    popular: ['createdAt:desc']
  };

  return sortMap[sortBy] || sortMap.relevance;
}

/**
 * Build MeiliSearch filters from query parameters
 * @param {Object} params - Query parameters
 * @param {string} params.contentType - Content type filter
 * @param {string} params.category - Category filter
 * @param {string} params.authorId - Author ID filter
 * @param {Array<string>} params.tags - Tags filter
 * @returns {string} - MeiliSearch filter string
 */
function buildMeiliSearchFilters(params) {
  const filters = [];

  if (params.contentType) {
    filters.push(`contentType = ${params.contentType}`);
  }

  if (params.category) {
    filters.push(`category = ${params.category}`);
  }

  if (params.authorId) {
    filters.push(`authorId = ${params.authorId}`);
  }

  if (params.tags && params.tags.length > 0) {
    // MeiliSearch uses 'IN' for array membership
    const tagsFilter = params.tags.map(tag => `tags = ${tag}`).join(' OR ');
    filters.push(`(${tagsFilter})`);
  }

  return filters.join(' AND ');
}

/**
 * Calculate offset from page and limit
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {number} - Offset value
 */
function calculateOffset(page, limit) {
  return (parseInt(page) - 1) * parseInt(limit);
}

module.exports = {
  mapSortByToMeiliSearch,
  buildMeiliSearchFilters,
  calculateOffset
};

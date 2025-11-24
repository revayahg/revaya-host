// Notification Link Utilities
// Provides consistent link generation for in-app navigation and email URLs
(function () {
  const DEFAULT_BASE_URL = 'https://revayahost.com';

  const isBrowser = typeof window !== 'undefined';

  const normalizeBaseUrl = (url) => {
    if (!url || typeof url !== 'string') return DEFAULT_BASE_URL;
    return url.replace(/\/+$/, '');
  };

  const getBaseUrl = () => {
    try {
      if (isBrowser) {
        if (window.NOTIFICATION_BASE_URL) {
          return normalizeBaseUrl(window.NOTIFICATION_BASE_URL);
        }
        const origin = window.location && window.location.origin;
        if (origin && origin !== 'null') {
          // Use localhost origin for local development
          if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return normalizeBaseUrl(origin);
          }
        }
      }
    } catch (error) {
      console.warn('NotificationLinkUtils: unable to resolve base URL, falling back to default.', error);
    }
    return DEFAULT_BASE_URL;
  };

  const extractHashFromUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return null;
    return `#${url.slice(hashIndex + 1)}`;
  };

  const ensureHashFormat = (hash) => {
    if (!hash) return null;
    if (hash.startsWith('#')) return hash;
    if (hash.startsWith('/')) return `#${hash.replace(/^\/+/, '')}`;
    return `#/${hash.replace(/^#*/, '')}`;
  };

  const toSearchParamsObject = (searchParams) => {
    if (!searchParams) return {};
    if (searchParams instanceof URLSearchParams) {
      return Object.fromEntries(searchParams.entries());
    }
    return { ...searchParams };
  };

  const buildFullUrl = (hash, searchParams = {}) => {
    if (!hash) return null;
    if (/^https?:\/\//i.test(hash)) return hash;

    const normalizedHash = ensureHashFormat(hash);
    const params = new URLSearchParams();
    Object.entries(searchParams || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const base = normalizeBaseUrl(getBaseUrl());
    const searchString = params.toString();
    if (searchString) {
      return `${base}/?${searchString}${normalizedHash}`;
    }
    return `${base}/${normalizedHash}`;
  };

  const normalizeExistingLink = (link) => {
    if (!link) return null;

    if (typeof link === 'string') {
      if (link.startsWith('#')) {
        return {
          hash: ensureHashFormat(link),
          searchParams: {},
          url: buildFullUrl(link, {})
        };
      }
      return {
        hash: extractHashFromUrl(link),
        searchParams: {},
        url: link
      };
    }

    if (typeof link === 'object') {
      const hash = ensureHashFormat(link.hash || extractHashFromUrl(link.url));
      const searchParams = toSearchParamsObject(link.searchParams || link.query);
      const url = link.url || buildFullUrl(hash, searchParams);
      return {
        hash,
        searchParams,
        url,
        intent: link.intent || null
      };
    }

    return null;
  };

  const tryMetadataLink = (metadata) => {
    if (!metadata) return null;
    if (metadata.link) {
      return normalizeExistingLink(metadata.link);
    }
    if (metadata.url) {
      return normalizeExistingLink(metadata.url);
    }
    if (metadata.accept_url) {
      return normalizeExistingLink(metadata.accept_url);
    }
    if (metadata.invite_url) {
      return normalizeExistingLink(metadata.invite_url);
    }
    return null;
  };

  const buildLinkFromType = (type, eventId, metadata = {}) => {
    if (!type) return null;
    const normalizedType = String(type).toLowerCase();
    const meta = metadata || {};

    // Task-related notifications
    if (['task', 'task_assigned', 'task_assignment', 'task_updated', 'task_completed'].includes(normalizedType)) {
      if (meta.task_assignment_token && normalizedType === 'task_assigned') {
        const encodedToken = encodeURIComponent(meta.task_assignment_token);
        const hashWithToken = `#/task-response?token=${encodedToken}`;
        return {
          hash: hashWithToken,
          searchParams: {},
          url: buildFullUrl(hashWithToken, {}),
          intent: 'response'
        };
      }

      if (eventId) {
        const params = { tab: 'tasks' };
        if (meta.task_id) params.task = meta.task_id;
        return {
          hash: `#/event/view/${eventId}`,
          searchParams: params,
          url: buildFullUrl(`#/event/view/${eventId}`, params),
          intent: 'view'
        };
      }
    }

    // Message / chat notifications
    if (['message', 'chat_message'].includes(normalizedType)) {
      if (eventId) {
        const params = { tab: 'event-chat' };
        if (meta.thread_id) params.thread = meta.thread_id;
        return {
          hash: `#/event/view/${eventId}`,
          searchParams: params,
          url: buildFullUrl(`#/event/view/${eventId}`, params),
          intent: 'view'
        };
      }
    }

    // Collaborator invitation
    if (normalizedType === 'collaborator_invitation') {
      if (meta.invitation_token) {
        const params = { token: meta.invitation_token };
        return {
          hash: '#/collaborator-invite-response',
          searchParams: params,
          url: buildFullUrl('#/collaborator-invite-response', params),
          intent: 'response'
        };
      }
      if (meta.invitation_url) {
        return normalizeExistingLink(meta.invitation_url);
      }
    }

    // Collaborator invitation responses & status changes
    if (['invitation_response', 'collaborator_status_changed'].includes(normalizedType)) {
      if (eventId) {
        const params = { tab: 'collaborators' };
        return {
          hash: `#/event/view/${eventId}`,
          searchParams: params,
          url: buildFullUrl(`#/event/view/${eventId}`, params),
          intent: 'manage'
        };
      }
    }

    // Event updates
    if (['event_update', 'event_updated'].includes(normalizedType)) {
      if (eventId) {
        const tab = meta.tab && ['basics', 'budget', 'tasks', 'event-chat', 'collaborators'].includes(meta.tab)
          ? meta.tab
          : 'basics';
        const params = tab ? { tab } : {};
        return {
          hash: `#/event/view/${eventId}`,
          searchParams: params,
          url: buildFullUrl(`#/event/view/${eventId}`, params),
          intent: 'view'
        };
      }
    }

    // Vendor updates / invitations
    if (['vendor_update', 'vendor_invitation'].includes(normalizedType)) {
      if (meta.accept_url) {
        return normalizeExistingLink(meta.accept_url);
      }
      if (eventId) {
        const params = { tab: 'vendors' };
        return {
          hash: `#/event/view/${eventId}`,
          searchParams: params,
          url: buildFullUrl(`#/event/view/${eventId}`, params),
          intent: 'manage'
        };
      }
    }

    // General invitation fallback
    if (normalizedType === 'invitation') {
      if (meta.invite_url) {
        return normalizeExistingLink(meta.invite_url);
      }
      if (eventId) {
        return {
          hash: `#/event/view/${eventId}`,
          searchParams: {},
          url: buildFullUrl(`#/event/view/${eventId}`),
          intent: 'view'
        };
      }
    }

    if (meta.url) {
      return normalizeExistingLink(meta.url);
    }

    if (eventId) {
      return {
        hash: `#/event/view/${eventId}`,
        searchParams: {},
        url: buildFullUrl(`#/event/view/${eventId}`),
        intent: 'view'
      };
    }

    return null;
  };

  const getNotificationLink = ({ type, eventId, metadata } = {}) => {
    try {
      const meta = metadata || {};
      const existing = tryMetadataLink(meta);
      if (existing) {
        return {
          hash: existing.hash || null,
          searchParams: toSearchParamsObject(existing.searchParams || {}),
          url: existing.url || buildFullUrl(existing.hash, existing.searchParams),
          intent: existing.intent || meta.intent || null
        };
      }

      const generated = buildLinkFromType(type, eventId, meta);
      if (!generated) return null;

      return {
        hash: generated.hash || null,
        searchParams: toSearchParamsObject(generated.searchParams || {}),
        url: generated.url || buildFullUrl(generated.hash, generated.searchParams),
        intent: generated.intent || meta.intent || null
      };
    } catch (error) {
      console.warn('NotificationLinkUtils: failed to build link for notification.', { type, eventId, metadata, error });
      return null;
    }
  };

  if (isBrowser) {
    window.NotificationLinkUtils = {
      getBaseUrl,
      buildFullUrl,
      getNotificationLink
    };
  }
})();


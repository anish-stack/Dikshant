class helpers {
    static generateSlug(name) {
        if (!name || typeof name !== 'string') {
            console.warn("Slug received invalid value:", name);
            return '';
        }

        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    static normalizeArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            // e.g. "A,B,C"
            return String(value)
                .split(',')
                .map(v => v.trim())
                .filter(Boolean);
        }
    }
}

module.exports = helpers;

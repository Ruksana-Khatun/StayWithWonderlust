module.exports = function flashMiddleware(req, res, next) {
  if (!req.session) {
    return next(new Error("Flash middleware requires sessions"));
  }

  const ensureFlashStore = () => {
    // Passport (or other auth flows) can regenerate the session during a request,
    // so we must ensure the flash store exists at call time, not just once here.
    if (!req.session) {
      throw new Error("Flash middleware requires sessions");
    }
    if (!req.session.flash || typeof req.session.flash !== "object") {
      req.session.flash = {};
    }
  };

  ensureFlashStore();

  req.flash = (type, message) => {
    if (!type) return [];
    ensureFlashStore();

    // Getter: req.flash("success") -> returns and clears messages
    if (typeof message === "undefined") {
      const messages = req.session.flash[type] || [];
      delete req.session.flash[type];
      return messages;
    }

    // Setter: req.flash("success", "Saved!") or req.flash("success", ["a","b"])
    const msgs = Array.isArray(message) ? message : [message];
    if (!req.session.flash[type]) req.session.flash[type] = [];
    req.session.flash[type].push(...msgs.filter((m) => m != null && m !== ""));
    return req.session.flash[type].length;
  };

  next();
};

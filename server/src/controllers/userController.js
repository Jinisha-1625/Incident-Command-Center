import { User } from "../models/User.js";
import { Incident } from "../models/Incident.js";

export async function listTeamWorkload(_req, res, next) {
  try {
    const users = await User.find().sort({ name: 1 });
    const open = await Incident.aggregate([
      { $match: { status: { $ne: "resolved" }, assignee: { $ne: null } } },
      { $group: { _id: "$assignee", count: { $sum: 1 } } },
    ]);
    const resolved = await Incident.aggregate([
      { $match: { status: "resolved" } },
      {
        $group: {
          _id: { $ifNull: ["$resolvedBy", "$assignee"] },
          count: { $sum: 1 },
        },
      },
    ]);

    const openMap = Object.fromEntries(open.map((r) => [String(r._id), r.count]));
    const resolvedMap = Object.fromEntries(
      resolved.filter((r) => r._id).map((r) => [String(r._id), r.count])
    );

    res.json({
      people: users.map((u) => {
        const json = u.toJSON();
        return {
          ...json,
          openCount: openMap[json.id] || 0,
          resolvedCount: resolvedMap[json.id] || 0,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}

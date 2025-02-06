import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { fid, username, notificationToken, notificationUrl } = req.body;

      const user = await prisma.user.upsert({
        where: { fid },
        update: {
          username,
          notificationToken,
          notificationUrl,
        },
        create: {
          fid,
          username,
          notificationToken,
          notificationUrl,
        },
      });

      res.status(200).json(user);
    } catch (error) {
      console.error("User Creation Error:", error);
      res.status(500).json({ error: "Failed to create/update user" });
    }
  } else if (req.method === 'GET') {
    try {
      const { fid } = req.query;

      if (fid) {
        const user = await prisma.user.findUnique({
          where: { fid: parseInt(fid as string) },
        });
        res.status(200).json(user);
      } else {
        const users = await prisma.user.findMany();
        res.status(200).json(users);
      }
    } catch (error) {
      console.error("User Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

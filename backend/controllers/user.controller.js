import User from '../models/user.model.js';

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user._id;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    }).select('-password');

    res.status(200).json(users);
  } catch (error) {
    console.error('Error in searchUsers controller:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const userId = req.user._id;

    const updates = {};
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
      updates.username = username;
    }

    if (avatar) {
      updates.avatar = avatar;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error in updateProfile controller:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

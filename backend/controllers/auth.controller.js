import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { generateTokenAndSetCookie } from '../utils/generateToken.js';

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Elegant Dicebear avatar generator for immediate visual quality
    const avatarUrl = `https://api.dicebear.com/8.x/adventurer/svg?seed=${username}`;

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      avatar: avatarUrl,
    });

    if (newUser) {
      generateTokenAndSetCookie(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
      });
    } else {
      res.status(400).json({ error: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Error in signup controller:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await User.findOne({ username });
    const isPasswordCorrect = await bcrypt.compare(password, user?.password || '');

    if (!user || !isPasswordCorrect) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    generateTokenAndSetCookie(user._id, res);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error('Error in login controller:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie('jwt', '', { maxAge: 0 });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error in logout controller:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    console.error('Error in getMe controller:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

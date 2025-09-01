import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../database';
import crypto from 'crypto';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'instructor' | 'admin';
  is_active: boolean;
  is_verified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export class JWTAuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private readonly ACCESS_TOKEN_EXPIRES = '15m';
  private readonly REFRESH_TOKEN_EXPIRES = '7d';

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateAccessToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
      },
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRES }
    );
  }

  generateRefreshToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        type: 'refresh'
      },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES }
    );
  }

  async verifyAccessToken(token: string): Promise<User | null> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as any;
      
      if (payload.type !== 'access') {
        return null;
      }

      // Verify user still exists and is active
      const userResult = await db.findById('users', payload.userId);
      
      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];
      
      if (!user.is_active) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active,
        is_verified: user.is_verified
      };
    } catch (error) {
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<User | null> {
    try {
      const payload = jwt.verify(token, this.JWT_REFRESH_SECRET) as any;
      
      if (payload.type !== 'refresh') {
        return null;
      }

      // Verify session exists and is active
      const sessionResult = await db.findMany('user_sessions', {
        where: { refresh_token: token, is_active: true }
      });

      if (sessionResult.rows.length === 0) {
        return null;
      }

      const userResult = await db.findById('users', payload.userId);
      
      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];
      
      if (!user.is_active) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active,
        is_verified: user.is_verified
      };
    } catch (error) {
      return null;
    }
  }

  async login(email: string, password: string, deviceInfo?: string, ipAddress?: string): Promise<AuthTokens | null> {
    try {
      // Find user by email
      const userResult = await db.findMany('users', {
        where: { email: email.toLowerCase(), is_active: true }
      });

      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        return null;
      }

      // Update last login
      await db.update('users', user.id, { last_login: new Date() });

      // Generate tokens
      const userPayload: User = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active,
        is_verified: user.is_verified
      };

      const accessToken = this.generateAccessToken(userPayload);
      const refreshToken = this.generateRefreshToken(userPayload);

      // Store session
      await this.createSession(user.id, accessToken, refreshToken, deviceInfo, ipAddress);

      return {
        accessToken,
        refreshToken,
        user: userPayload
      };
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  async register(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role?: 'student' | 'instructor';
  }): Promise<AuthTokens | null> {
    try {
      // Check if user already exists
      const existingUser = await db.findMany('users', {
        where: { email: userData.email.toLowerCase() }
      });

      if (existingUser.rows.length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const userResult = await db.create('users', {
        email: userData.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone || null,
        role: userData.role || 'student',
        verification_token: verificationToken,
        is_active: true,
        is_verified: false
      });

      const newUser = userResult.rows[0];

      // Create user preferences
      await db.create('user_preferences', {
        user_id: newUser.id,
        email_notifications: true,
        course_updates: true,
        marketing_emails: false,
        language: 'tr',
        timezone: 'Europe/Istanbul',
        theme: 'light'
      });

      const userPayload: User = {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
        is_active: newUser.is_active,
        is_verified: newUser.is_verified
      };

      // Generate tokens
      const accessToken = this.generateAccessToken(userPayload);
      const refreshToken = this.generateRefreshToken(userPayload);

      // Store session
      await this.createSession(newUser.id, accessToken, refreshToken);

      return {
        accessToken,
        refreshToken,
        user: userPayload
      };
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const user = await this.verifyRefreshToken(refreshToken);
      
      if (!user) {
        return null;
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Update session with new tokens
      await db.query(
        'UPDATE user_sessions SET session_token = $1, refresh_token = $2, last_used = NOW() WHERE refresh_token = $3',
        [newAccessToken, newRefreshToken, refreshToken]
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  async logout(refreshToken: string): Promise<boolean> {
    try {
      await db.query(
        'UPDATE user_sessions SET is_active = false WHERE refresh_token = $1',
        [refreshToken]
      );
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  async logoutAll(userId: number): Promise<boolean> {
    try {
      await db.query(
        'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
        [userId]
      );
      return true;
    } catch (error) {
      console.error('Logout all error:', error);
      return false;
    }
  }

  private async createSession(
    userId: number, 
    accessToken: string, 
    refreshToken: string, 
    deviceInfo?: string, 
    ipAddress?: string
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.create('user_sessions', {
      user_id: userId,
      session_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      device_info: deviceInfo || null,
      ip_address: ipAddress || null,
      is_active: true
    });
  }
}

export const authService = new JWTAuthService();
// frontend-web/src/components/profile/UserProfile.tsx
import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/apiService';
import { encryptionService } from '../../services/encryptionService';
import './UserProfile.css';

const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    phoneNumber: user?.phoneNumber || '',
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await apiService.uploadAvatar(formData);
      await updateUser({ avatarUrl: response.url });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateUser(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const generateKeyPair = async () => {
    try {
      const keyPair = await encryptionService.generateKeyPair();
      await updateUser({ publicKey: keyPair.publicKey });
      // Store private key securely
      await encryptionService.storePrivateKey(keyPair.privateKey);
    } catch (error) {
      console.error('Failed to generate key pair:', error);
    }
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="avatar-container">
          <img
            src={user?.avatarUrl || '/default-avatar.png'}
            alt={user?.username}
            className="profile-avatar"
          />
          <button
            className="avatar-upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-camera'}`} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
        </div>
        
        <div className="profile-info">
          <h2>{user?.username}</h2>
          <span className="profile-status">
            <i className={`fas fa-circle ${user?.isOnline ? 'online' : 'offline'}`} />
            {user?.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="profile-details">
        <div className="detail-item">
          <label>Username</label>
          {isEditing ? (
            <input
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          ) : (
            <span>{user?.username}</span>
          )}
        </div>

        <div className="detail-item">
          <label>Email</label>
          {isEditing ? (
            <input
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          ) : (
            <span>{user?.email}</span>
          )}
        </div>

        <div className="detail-item">
          <label>Bio</label>
          {isEditing ? (
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
            />
          ) : (
            <span>{user?.bio || 'No bio yet'}</span>
          )}
        </div>

        <div className="detail-item">
          <label>Phone Number</label>
          {isEditing ? (
            <input
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          ) : (
            <span>{user?.phoneNumber || 'Not set'}</span>
          )}
        </div>
      </div>

      <div className="security-section">
        <h3>Security Settings</h3>
        
        <div className="security-item">
          <div>
            <h4>Encryption Keys</h4>
            <p>Generate your public/private key pair for end-to-end encryption</p>
          </div>
          <button onClick={generateKeyPair} className="generate-keys-button">
            <i className="fas fa-key" /> Generate Keys
          </button>
        </div>

        <div className="security-item">
          <div>
            <h4>Two-Factor Authentication</h4>
            <p>Add an extra layer of security to your account</p>
          </div>
          <button className="enable-2fa-button">
            <i className="fas fa-shield-alt" /> Enable 2FA
          </button>
        </div>
      </div>

      <div className="profile-actions">
        {isEditing ? (
          <>
            <button onClick={handleSave} className="save-button">
              Save Changes
            </button>
            <button onClick={() => setIsEditing(false)} className="cancel-button">
              Cancel
            </button>
          </>
        ) : (
          <button onClick={() => setIsEditing(true)} className="edit-button">
            <i className="fas fa-edit" /> Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
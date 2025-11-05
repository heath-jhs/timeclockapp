// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [user.id]);

  if (loading) return <p className="p-6 text-center">Loading profile...</p>;

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6 text-center">My Profile</h1>

      {profile?.avatar_url ? (
        <div className="flex justify-center mb-4">
          <img
            src={profile.avatar_url}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
          />
        </div>
      ) : (
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center">
            <span className="text-gray-500 text-xs">No photo</span>
          </div>
        </div>
      )}

      <div className="space-y-3 text-left">
        <div>
          <p className="text-sm font-medium text-gray-600">Name</p>
          <p className="text-lg">{profile?.full_name || 'Not set'}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-600">Email</p>
          <p className="text-lg">{user.email}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-600">Role</p>
          <p className="text-lg capitalize">{profile?.role || 'Employee'}</p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => alert('Edit profile coming soon!')}
          className="text-sm text-blue-600 hover:underline"
        >
          Edit Profile →
        </button>
      </div>
    </div>
  );
}

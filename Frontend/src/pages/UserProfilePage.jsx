import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, Clock, TrendingUp, User, Calendar, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/UI';
import { formatDate } from '../utils/helpers';
import { getUserProfile } from '../api/AdminService';
import toast from 'react-hot-toast';

function StatPill({ label, value, color = 'text-gray-700' }) {
  return (
    <div className="flex flex-col items-center bg-gray-50 rounded-2xl py-4 px-3 border border-gray-100">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-gray-400 mt-0.5 text-center">{label}</span>
    </div>
  );
}

export default function UserProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Don't fetch your own profile here — redirect to /profile
      if (id === currentUser?.id) {
        navigate('/profile', { replace: true });
        return;
      }
      try {
        const res = await getUserProfile(id);
        setProfile(res.data);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 403) {
          toast.error('This profile is not available.');
        } else if (status === 404) {
          toast.error('User not found.');
        } else {
          toast.error('Failed to load profile.');
        }
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, currentUser?.id, navigate]);

  if (loading) {
    return (
      <div className="page-enter">
        <div className="animate-pulse space-y-4 max-w-lg mx-auto mt-8">
          <div className="h-24 bg-gray-100 rounded-2xl" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const initials = (profile.firstName?.[0] ?? '') + (profile.lastName?.[0] ?? '');
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  console.log(profile);

  return (
    <div className="page-enter max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      {/* Profile card */}
      <div className="card p-6 mb-4">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          {profile.profilePictureUrl ? (
            <img
              src={profile.profilePictureUrl}
              alt={fullName}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100 flex-shrink-0"
            />
          ) : (
            <Avatar initials={initials} size="xl" color="blue" />
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{fullName || 'Unknown User'}</h1>
            {profile.designation && (
              <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 mt-1 mb-2">
                {profile.designation ?? "No designation"}
              </span>
            )}
            {profile.bio && (
              <p className="text-sm text-gray-500 leading-relaxed mt-2">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-50">
          {profile.email && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User size={12} className="text-gray-400" />
              {profile.email}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={12} className="text-gray-400" />
            Joined {formatDate(profile.createdAt)}
          </div>
          {profile.designation && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Briefcase size={12} className="text-gray-400" />
              {profile.designation}
            </div>
          )}
        </div>
      </div>

      {/* Task stats */}
      <div className="card p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Task statistics
        </p>
        <div className="grid grid-cols-4 gap-3">
          <StatPill label="Total assigned"  value={profile.taskStats?.total      ?? 0} />
          <StatPill label="In progress"     value={profile.taskStats?.inProgress ?? 0} color="text-blue-600" />
          <StatPill label="Completed"       value={profile.taskStats?.completed  ?? 0} color="text-green-600" />
          <StatPill label="Overdue"         value={profile.taskStats?.overdue    ?? 0} color={profile.taskStats?.overdue > 0 ? 'text-red-500' : 'text-gray-700'} />
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import api from '../api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const ProfilePage = () => {
  const [data, setData] = useState({ email: '', role: '', Profile: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/profile')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/profile', {
        full_name: data.Profile.full_name,
        phone: data.Profile.phone,
        bio: data.Profile.bio
      });
      alert("Данные сохранены!");
    } catch (err) {
      alert("Ошибка сохранения");
    }
  };

  if (loading) return <div className="p-10 text-center">Загрузка...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Личный кабинет</h1>
        
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block">
              <span className="text-gray-500 text-sm">Ваш Email</span>
              <Input value={data.email} disabled className="bg-gray-50" />
            </label>
            <label className="block">
              <span className="text-gray-500 text-sm">Роль в системе</span>
              <Input value={data.role} disabled className="bg-gray-50" />
            </label>
            <label className="block">
              <span className="text-gray-700 text-sm font-medium">ФИО</span>
              <Input 
                value={data.Profile?.full_name || ''} 
                onChange={e => setData({...data, Profile: {...data.Profile, full_name: e.target.value}})}
              />
            </label>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-gray-700 text-sm font-medium">Телефон</span>
              <Input 
                value={data.Profile?.phone || ''} 
                onChange={e => setData({...data, Profile: {...data.Profile, phone: e.target.value}})}
              />
            </label>
            <label className="block">
              <span className="text-gray-700 text-sm font-medium">
                {data.role === 'Candidate' ? 'О себе / Резюме' : 'Описание компании'}
              </span>
              <textarea 
                className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-32"
                value={data.Profile?.bio || ''}
                onChange={e => setData({...data, Profile: {...data.Profile, bio: e.target.value}})}
              />
            </label>
          </div>

          <div className="md:col-span-2 pt-4">
            <Button type="submit" variant="primary" className="w-full md:w-auto px-12">
              Сохранить изменения
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
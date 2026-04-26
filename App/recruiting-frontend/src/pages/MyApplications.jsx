import React, { useState } from 'react';
import { Card } from '../components/ui/Card';

const MyApplications = () => {
  const [apps] = useState([
    { id: 1, title: 'Node.js Developer', company: 'Modsen', status: 'На рассмотрении', date: '25.04.2026' },
    { id: 2, title: 'React Engineer', company: 'HireVich', status: 'Приглашение', date: '20.04.2026' }
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Мои отклики</h1>
      <div className="grid gap-4">
        {apps.map(app => (
          <Card key={app.id} className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-primary">{app.title}</h3>
              <p className="text-sm text-gray-500">{app.company}</p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                app.status === 'Приглашение' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {app.status}
              </span>
              <p className="text-[10px] text-gray-400 mt-1">{app.date}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MyApplications;
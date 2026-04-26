import React, { useState, useEffect } from 'react';
import { Sparkles, Plus } from 'lucide-react'; // Добавил Plus
import api from '../api';

const TemplateManager = ({ onSelect }) => {
  const [dbTemplates, setDbTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/templates/global')
      .then(res => {
        setDbTemplates(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-blue-400 animate-pulse py-4">Загрузка стандартов...</div>;

  return (
    <div className="bg-blue-50/50 p-4 rounded-2xl mb-6 border border-blue-100/50">
      <div className="flex items-center gap-2 text-blue-700 font-bold mb-3 text-sm">
        <Sparkles size={16} className="text-blue-500" />
        <span>Применить ваш стандарт:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {dbTemplates.length > 0 ? (
          dbTemplates.map((t) => (
            <button
              key={t.GlobalTemplateId}
              type="button"
              onClick={() => onSelect(t)}
              className="group flex items-center gap-2 bg-white border border-blue-200 text-blue-600 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm active:scale-95"
            >
              <Plus size={14} className="text-blue-400 group-hover:text-white" />
              {t.name}
              <span className="bg-blue-50 text-[10px] px-1.5 py-0.5 rounded-md text-blue-400 group-hover:bg-blue-500 group-hover:text-white">
                {t.GlobalTemplateItems?.length || 0}
              </span>
            </button>
          ))
        ) : (
          <p className="text-xs text-gray-400 italic">У вас пока нет сохраненных шаблонов</p>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;
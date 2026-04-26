import React, { useState, useEffect } from 'react';

import { Tag, Sparkles } from 'lucide-react';

import api from '../api';



const TemplateManager = ({ onSelect }) => {

  const [presets] = useState([

    { name: 'Frontend Standart', stages: ['HR Интервью', 'Тестовое задание', 'Тех. собес', 'Оффер'] },

    { name: 'Backend Fast', stages: ['Скрининг', 'Live-coding', 'Финальное интервью'] }

  ]);



  return (

    <div className="bg-blue-50 p-4 rounded-2xl mb-6">

      <div className="flex items-center gap-2 text-blue-700 font-bold mb-3">

        <Sparkles size={18} />

        <span className="text-sm">Быстрые шаблоны:</span>

      </div>

      <div className="flex flex-wrap gap-2">

        {presets.map((p, i) => (

          <button

            key={i}

            type="button"

            onClick={() => onSelect(p.stages)}

            className="bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1"

          >

            <Tag size={12} /> {p.name}

          </button>

        ))}

      </div>

    </div>

  );

};



export default TemplateManager;
import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Product } from '../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: {
    code: string;
    name: string;
    category: string;
    manager: string;
    netValue: number;
    growthRate: number;
    status: 'online' | 'offline';
  }) => void;
  existingCodes: string[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingCodes,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('固定收益 (+)');
  const [manager, setManager] = useState('张博雅');
  const [netValue, setNetValue] = useState('1.0000');
  const [growthRate, setGrowthRate] = useState('0.00');
  const [status, setStatus] = useState<'online' | 'offline'>('online');
  const [errorObj, setErrorObj] = useState<{ code?: string; name?: string }>({});

  if (!isOpen) return null;

  // Auto generate a valid code
  const handleAutoGenerateCode = () => {
    let base = 111111;
    while (existingCodes.includes(base.toString()) && base < 999999) {
      base += 1;
    }
    setCode(base.toString());
    setErrorObj(prev => ({ ...prev, code: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { code?: string; name?: string } = {};

    // Validate 6 digit code
    if (!/^\d{6}$/.test(code)) {
      newErrors.code = '产品代码必须为6位纯数字';
    } else if (existingCodes.includes(code)) {
      newErrors.code = '该产品代码已存在，请重新输入或自动生成';
    }

    if (!name.trim()) {
      newErrors.name = '产品名称不能为空';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrorObj(newErrors);
      return;
    }

    onAdd({
      code,
      name: name.trim(),
      category,
      manager,
      netValue: parseFloat(netValue) || 1.0000,
      growthRate: parseFloat(growthRate) || 0.00,
      status,
    });

    // Reset fields
    setCode('');
    setName('');
    setCategory('固定收益 (+)');
    setManager('张博雅');
    setNetValue('1.0000');
    setGrowthRate('0.00');
    setStatus('online');
    setErrorObj({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="modal-container">
      <div 
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
        id="modal-content"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <div>
            <h3 className="text-lg font-semibold text-slate-800" id="modal-title">新增专户产品</h3>
            <p className="text-xs text-slate-500 mt-0.5" id="modal-subtitle">录入新产品的基础属性及初始投运状态</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
            id="modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" id="add-product-form">
          {/* Row 1: Code and Auto Generate */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              产品代码 <span className="text-red-500">*</span>
            </label>
            <div className="relative flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''));
                  setErrorObj(prev => ({ ...prev, code: undefined }));
                }}
                placeholder="请输入6位纯数字，如 111121"
                className={`flex-1 px-3 py-2 text-sm border font-mono rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errorObj.code ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-blue-500'
                }`}
                id="input-product-code"
              />
              <button
                type="button"
                onClick={handleAutoGenerateCode}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 cursor-pointer"
                id="btn-auto-code"
              >
                <Sparkles className="w-3.5 h-3.5" />
                自定顺序码
              </button>
            </div>
            {errorObj.code && (
              <p className="text-xs text-red-500 mt-1" id="error-code">{errorObj.code}</p>
            )}
          </div>

          {/* Row 2: Product Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              产品名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorObj(prev => ({ ...prev, name: undefined }));
              }}
              placeholder="请输入产品说明名称，例：理财特发3号专户"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errorObj.name ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
              }`}
              id="input-product-name"
            />
            {errorObj.name && (
              <p className="text-xs text-red-500 mt-1" id="error-name">{errorObj.name}</p>
            )}
          </div>

          {/* Row 3: Category & Manager */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">产品类型</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer bg-white"
                id="select-category"
              >
                <option value="固定收益 (+)">固定收益 (+)</option>
                <option value="量化混合">量化混合</option>
                <option value="权益增强">权益增强</option>
                <option value="多资产对冲">多资产对冲</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">投资经理</label>
              <select
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer bg-white"
                id="select-manager"
              >
                <option value="张博雅">张博雅</option>
                <option value="李宏威">李宏威</option>
                <option value="王泽宇">王泽宇</option>
                <option value="赵雪婷">赵雪婷</option>
                <option value="刘一帆">刘一帆</option>
              </select>
            </div>
          </div>

          {/* Row 4: Net Value & Growth Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">初始单位净值</label>
              <input
                type="number"
                step="0.0001"
                min="0.1000"
                max="10.0000"
                value={netValue}
                onChange={(e) => setNetValue(e.target.value)}
                placeholder="1.0000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                id="input-net-value"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">日涨跌幅 (%)</label>
              <input
                type="number"
                step="0.01"
                value={growthRate}
                onChange={(e) => setGrowthRate(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                id="input-growth-rate"
              />
            </div>
          </div>

          {/* Row 5: Status Option */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">初始发布状态</label>
            <div className="flex items-center gap-6" id="status-radio-group">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-slate-700">
                <input
                  type="radio"
                  checked={status === 'online'}
                  onChange={() => setStatus('online')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  id="status-online-radio"
                />
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                  上线中 (Online)
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-slate-700">
                <input
                  type="radio"
                  checked={status === 'offline'}
                  onChange={() => setStatus('offline')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  id="status-offline-radio"
                />
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-150 text-slate-600 border border-gray-200">
                  已下线 (Offline)
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6 bg-slate-50/50 -mx-6 -mb-6 p-4 px-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-gray-200 rounded-lg transition-colors cursor-pointer"
              id="btn-cancel-add"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-lg shadow-sm shadow-blue-500/10 hover:shadow-blue-500/25 transition-all cursor-pointer"
              id="btn-submit-add"
            >
              确定录入
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

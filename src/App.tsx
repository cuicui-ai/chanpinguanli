/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Pin, 
  PinOff, 
  GripVertical, 
  RotateCcw, 
  HelpCircle, 
  ChevronUp, 
  ChevronDown, 
  LayoutDashboard,
  Coins,
  TrendingUp,
  SlidersHorizontal,
  Info,
  CheckCircle,
  XCircle,
  Sparkles,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, FilterStatus, DashboardStats } from './types';
import { generateDefaultProducts } from './mockData';
import { ProductFormModal } from './components/ProductFormModal';

export default function App() {
  // Products state - initialized from localStorage if available, else mock data
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('product_catalog_manager_data');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed parsing cached products", e);
      }
    }
    return generateDefaultProducts();
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  // Auto-clear toast helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Persist state updates to localStorage
  const saveToStorage = (updatedList: Product[]) => {
    localStorage.setItem('product_catalog_manager_data', JSON.stringify(updatedList));
  };

  const showToast = (text: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToastMessage({ text, type });
  };

  // 1. Action: Toggle Online / Offline ("操作: 上线/下线")
  const handleToggleStatus = (id: string) => {
    const updated = products.map((product) => {
      if (product.id === id) {
        const nextStatus = product.status === 'online' ? 'offline' : 'online';
        showToast(
          `产品 [${product.code}] 已成功更改为: ${nextStatus === 'online' ? '上线中' : '已下线'}`,
          nextStatus === 'online' ? 'success' : 'warn'
        );
        return { ...product, status: nextStatus };
      }
      return product;
    });
    setProducts(updated);
    saveToStorage(updated);
  };

  // 2. Action: Toggle Pin / Unpin ("操作: 置顶/取消置顶")
  const handleTogglePin = (id: string) => {
    // Flag changes
    const updated = [...products];
    const targetIdx = updated.findIndex(p => p.id === id);
    if (targetIdx === -1) return;

    const item = updated[targetIdx];
    const nextPinState = !item.isPinned;
    item.isPinned = nextPinState;

    // Moving item dynamically based on Pin layout preference:
    // When pinning, float to index 0. When unpinning, sink below other pinned items.
    updated.splice(targetIdx, 1);
    if (nextPinState) {
      // Pinning: Move to absolute top of the index map
      updated.unshift(item);
      showToast(`产品 [${item.name}] 已经锁定至展示前端`, 'success');
    } else {
      // Unpinning: Move to the end of pinned product pile or just return to index mapping
      const lastPinnedIdx = updated.findIndex(p => !p.isPinned);
      const insertAt = lastPinnedIdx === -1 ? 0 : lastPinnedIdx;
      updated.splice(insertAt, 0, item);
      showToast(`产品 [${item.name}] 已恢复至常态排序区`, 'info');
    }

    // Recalculate visual index sequence
    const finalProducts = updated.map((p, idx) => ({ ...p, sortOrder: idx + 1 }));
    setProducts(finalProducts);
    saveToStorage(finalProducts);
  };

  // 3. Action: Re-order index calculation helpers
  const handleReorderIndex = (id: string, newPositionVal: number) => {
    // Bound threshold checks
    if (newPositionVal < 1) newPositionVal = 1;
    if (newPositionVal > products.length) newPositionVal = products.length;

    const sourceIdx = products.findIndex(p => p.id === id);
    if (sourceIdx === -1) return;

    const destIdx = newPositionVal - 1;
    if (sourceIdx === destIdx) return; // Unchanged

    const item = products[sourceIdx];
    const updated = [...products];
    
    // Splice and Insert
    updated.splice(sourceIdx, 1);
    updated.splice(destIdx, 0, item);

    // Re-index all sortOrder values to match the absolute coordinate placements
    const reordered = updated.map((p, idx) => ({
      ...p,
      sortOrder: idx + 1
    }));

    setProducts(reordered);
    saveToStorage(reordered);
    showToast(`成功将产品 [${item.code}] 的展示层级调整至第 ${newPositionVal} 位`, 'success');
  };

  // 4. Action: Arrow Fine-tuning Stepwise (上移 / 下移)
  const handleStepwiseMove = (id: string, direction: 'up' | 'down') => {
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return;

    const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= products.length) return; // out of bounds

    const updated = [...products];
    // Swap items
    const temp = updated[idx];
    updated[idx] = updated[nextIdx];
    updated[nextIdx] = temp;

    // Re-assign numbers
    const reordered = updated.map((p, index) => ({
      ...p,
      sortOrder: index + 1
    }));
    
    setProducts(reordered);
    saveToStorage(reordered);
  };

  // 5. Native HTML5 Drag and Drop Handlers for fluid reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Drag and drop is disabled when filtering or searching to prevent logic mismatch
    if (searchQuery || filter !== 'all') {
      e.preventDefault();
      showToast('请在“全部产品”模式下且未输入检索字词时进行拖拽排序', 'warn');
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Essential for Firefox drag compatibility
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Quick swap visual feedback in local memory
    const updated = [...products];
    const item = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, item);
    
    // Pre-reorder visually
    const reordered = updated.map((p, idx) => ({ ...p, sortOrder: idx + 1 }));
    setProducts(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    saveToStorage(products);
  };

  // 6. Action: Add New Special Account Product ("新增专户产品")
  const handleAddProduct = (newProductData: {
    code: string;
    name: string;
    category: string;
    manager: string;
    netValue: number;
    growthRate: number;
    status: 'online' | 'offline';
  }) => {
    const newProduct: Product = {
      id: `prod_${newProductData.code}`,
      code: newProductData.code,
      name: newProductData.name,
      status: newProductData.status,
      isPinned: false,
      sortOrder: 1, // Will insert at absolute top of standard products
      category: newProductData.category,
      manager: newProductData.manager,
      netValue: newProductData.netValue,
      growthRate: newProductData.growthRate,
      createdAt: new Date().toISOString()
    };

    // Place at the very top of products list and shift indices
    const updatedList = [newProduct, ...products].map((p, idx) => ({
      ...p,
      sortOrder: idx + 1
    }));

    setProducts(updatedList);
    saveToStorage(updatedList);
    showToast(`新专户产品 [${newProductData.name}] (代码: ${newProductData.code}) 已经成功建档并发起`, 'success');
  };

  // 7. Action: Reset order/Restore Defaults (重置排序)
  const handleResetToDefault = () => {
    if (window.confirm("确定要恢复到默认排序（即按产品代码递增且初始排序）吗？已有拖拽及手动排位修改将重置。")) {
      const reset = generateDefaultProducts();
      setProducts(reset);
      saveToStorage(reset);
      showToast("已成功重置产品库到 50 个默认测试专户产品，排序回归基准代码。", "info");
    }
  };

  // Calculated Metrics
  const stats = useMemo<DashboardStats>(() => {
    return products.reduce(
      (acc, curr) => {
        acc.total += 1;
        if (curr.status === 'online') acc.online += 1;
        else acc.offline += 1;
        if (curr.isPinned) acc.pinned += 1;
        return acc;
      },
      { total: 0, online: 0, offline: 0, pinned: 0 }
    );
  }, [products]);

  // Combined Searching & Categoric Filtering
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Search Query match
      const lowerQuery = searchQuery.toLowerCase().trim();
      const codeMatches = product.code.includes(lowerQuery);
      const nameMatches = product.name.toLowerCase().includes(lowerQuery);
      const matchesSearch = searchQuery === '' || codeMatches || nameMatches;

      // 2. Tab Filter match
      if (!matchesSearch) return false;
      if (filter === 'all') return true;
      if (filter === 'online') return product.status === 'online';
      if (filter === 'offline') return product.status === 'offline';
      if (filter === 'pinned') return product.isPinned;
      return true;
    });
  }, [products, searchQuery, filter]);

  const existingCodes = useMemo(() => products.map(p => p.code), [products]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" id="app-root-container">
      {/* Banner / Header Bar */}
      <header className="sticky top-0 z-20 w-full bg-slate-900 text-white shadow-md border-b border-slate-950" id="main-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-inner">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">专户产品展示与自主人工排序终端</h1>
              <p className="text-xs text-slate-400 mt-0.5">机构专属 · 产品精选与前台顺序人工可视化精细管控系统</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                showGuide 
                  ? 'bg-slate-800 text-blue-400 border-slate-700' 
                  : 'bg-slate-800/40 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showGuide ? '收起交互方案说明' : '查看人工排序方案'}
            </button>
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="一键恢复50个精选产品初始配置"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置预置库
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="main-app-content">
        {/* Onboarding / Interactive Designs Guide Section */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
              id="guide-accordion-panel"
            >
              <div className="bg-gradient-to-r from-blue-50/70 to-slate-50 border border-blue-100 rounded-xl p-5 shadow-sm text-slate-700 relative">
                <button 
                  onClick={() => setShowGuide(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold p-1 text-sm rounded bg-slate-100/50 hover:bg-slate-200/50 cursor-pointer"
                >
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
                <div className="flex gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0 self-start">
                    <SlidersHorizontal className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      💡 4维交互设计：解决 50 个产品前台展示人工重排方案
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 mr-6">
                      如何对数量较多（约50个）的产品进行手动的、可预测性强的人工页面优先级排定？为此，我们在界面上嵌入了四种可以联动并行的优秀操作机制，任你调用：
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      <div className="bg-white p-3 rounded-lg border border-blue-50 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-1.5 text-amber-600 font-medium text-xs mb-1">
                          <Pin className="w-3.5 h-3.5 fill-amber-500" />
                          <span>① 一键极速置顶 (Pin)</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          点击列表项右侧的<b>📌置顶图钉</b>，可以让主推产品直接摆脱基础队列，永久锁定浮动至列表<b>最前方推广高亮区</b>。
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-blue-50 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs mb-1">
                          <GripVertical className="w-3.5 h-3.5" />
                          <span>② 画布拖拽重排 (Drag)</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          抓取每行最左侧的 <b>✥ 拖拽手柄</b>，可在当前分页列表内随意上下推移，松开即触发整体顺滑位移布局。
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-blue-50 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs mb-1">
                          <span className="font-mono bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded border border-emerald-100">Nº</span>
                          <span>③ 序号直接指定 (Rank)</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          针对 50 余产品进行超长跨距拖拽时极易疲劳。现在可<b>直接在表单序号框中输入你要的精确顺次 (如 1 或 10) 并回车</b>，将瞬间飞跃就位！
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-blue-50 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-1.5 text-indigo-600 font-medium text-xs mb-1">
                          <div className="flex flex-col -space-y-1">
                            <ChevronUp className="w-2.5 h-2.5" />
                            <ChevronDown className="w-2.5 h-2.5" />
                          </div>
                          <span>④ 局部气泡微调 (Arrows)</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          利用行上的 <b>⬆ / ⬇ 键 </b>，支持产品在相邻位置上以一格为步进单步穿梭微调，适合局部微小的精确卡位。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Core Statistics Blocks */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-statistics-grid">
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">产品总数 (Total Models)</p>
              <h4 className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.total} <span className="text-xs font-normal text-slate-400">个</span></h4>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">公募/专户上线中</p>
              <h4 className="text-2xl font-bold font-mono text-emerald-600 mt-1">{stats.online} <span className="text-xs font-normal text-slate-400">个</span></h4>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">暂不下线储备</p>
              <h4 className="text-2xl font-bold font-mono text-slate-500 mt-1">{stats.offline} <span className="text-xs font-normal text-slate-400">个</span></h4>
            </div>
            <div className="p-2.5 bg-gray-100 text-slate-5050 rounded-lg">
              <XCircle className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between bg-gradient-to-br from-amber-50/20 to-white">
            <div>
              <p className="text-xs font-medium text-slate-500">置顶主推广产品</p>
              <h4 className="text-2xl font-bold font-mono text-amber-600 mt-1">{stats.pinned} <span className="text-xs font-normal text-slate-400">个</span></h4>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-500 rounded-lg">
              <Pin className="w-5 h-5 fill-amber-500" />
            </div>
          </div>
        </div>

        {/* Global Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-3 px-4 rounded-lg text-sm font-medium shadow-md flex items-center gap-2 border ${
                toastMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : toastMessage.type === 'warn'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
              id="global-toast-message"
            >
              {toastMessage.type === 'success' ? (
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              ) : toastMessage.type === 'warn' ? (
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              )}
              {toastMessage.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Catalog Control Header Panel (Filter / Search Area) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" id="filter-search-control-panel">
          {/* Main search and new btn row */}
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Search Input bar (Styled exactly mirroring requirements: 搜索: 产品名称/产品代码) */}
            <div className="flex-1 max-w-lg relative flex items-center">
              <div className="absolute left-3.5 text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索: 输入产品名称/产品代码进行快速过滤..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow bg-slate-50/50"
                id="main-product-search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded px-1.5 py-0.5"
                >
                  清空
                </button>
              )}
            </div>

            {/* Action Buttons: Add special product (按键：新增专户产品) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/10 hover:shadow-blue-500/20 active:translate-y-[0.5px] transition-all cursor-pointer"
                id="btn-trigger-add-product"
              >
                <Plus className="w-4 h-4 text-white" />
                新增专户产品
              </button>
            </div>
          </div>

          {/* Filtering TABS + Display guidelines info */}
          <div className="px-5 py-3.5 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs border-b border-gray-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 font-medium">列表过滤：</span>
              
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'all' 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-gray-200 hover:bg-slate-100'
                }`}
              >
                全部产品 ({products.length})
              </button>

              <button
                onClick={() => setFilter('online')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'online' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-gray-200'
                }`}
              >
                上线中 ({products.filter(p => p.status === 'online').length})
              </button>

              <button
                onClick={() => setFilter('offline')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'offline' 
                    ? 'bg-gray-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
                }`}
              >
                已下线 ({products.filter(p => p.status === 'offline').length})
              </button>

              <button
                onClick={() => setFilter('pinned')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  filter === 'pinned' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                <Pin className="w-3 h-3 fill-amber-500 text-amber-500" />
                置顶区 ({products.filter(p => p.isPinned).length})
              </button>
            </div>

            <div className="text-slate-500 flex items-center gap-1.5 font-mono text-[11px] leading-relaxed select-none">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>当前展示共计 <b>{filteredProducts.length}</b> 个匹配专户产品</span>
              {searchQuery && <span className="text-blue-600">（已启用全局关键词检索）</span>}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto" id="product-table-wrapper">
            <table className="w-full text-left border-collapse" id="product-table">
              <thead>
                <tr className="bg-slate-50 text-[13px] font-semibold text-slate-600 select-none border-b border-gray-200">
                  <th className="py-3 px-4 w-12 text-center">序位</th>
                  <th className="py-3 px-1 w-12 text-center">拖拽</th>
                  <th className="py-3 px-4 w-28 text-left font-mono">产品代码</th>
                  <th className="py-3 px-4 text-left">产品名称</th>
                  <th className="py-3 px-4 w-32 text-left">投资类型</th>
                  <th className="py-3 px-3 w-28 text-left">投资经理</th>
                  <th className="py-3 px-4 w-28 text-right font-mono">最新单位净值</th>
                  <th className="py-3 px-4 w-24 text-right font-mono">涨跌幅</th>
                  <th className="py-3 px-4 w-36 text-center">手动排序修改</th>
                  <th className="py-3 px-4 w-24 text-center">操作</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence initial={false}>
                  {filteredProducts.length === 0 ? (
                    <motion.tr 
                      layout 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white"
                      id="table-empty-row"
                    >
                      <td colSpan={10} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                          <div className="p-3 bg-slate-100 text-slate-400 rounded-full mb-3">
                            <Search className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800">未检索到对应专户产品</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            未找到与 “{searchQuery}” 相符的记录。请尝试精简查询字词，或切换状态过滤标签。
                          </p>
                          <button
                            onClick={() => { setSearchQuery(''); setFilter('all'); }}
                            className="mt-4 px-3.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            重置过滤条件
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ) : (
                    filteredProducts.map((product, relativeIndex) => {
                      // Lookup its master index in the source array
                      const masterIndex = products.findIndex(p => p.id === product.id);
                      const displayRank = masterIndex + 1;

                      return (
                        <motion.tr
                          key={product.id}
                          layoutId={product.id}
                          layout="position"
                          draggable={!searchQuery && filter === 'all'}
                          onDragStart={(e) => handleDragStart(e, masterIndex)}
                          onDragOver={(e) => handleDragOver(e, masterIndex)}
                          onDragEnd={handleDragEnd}
                          onMouseEnter={() => setHoveredRowIndex(relativeIndex)}
                          onMouseLeave={() => setHoveredRowIndex(null)}
                          className={`group transition-all select-none ${
                            product.isPinned 
                              ? 'bg-amber-50/20 hover:bg-amber-50/45 border-l-4 border-l-amber-500' 
                              : 'bg-white hover:bg-slate-50/80 border-l-4 border-l-transparent'
                          } ${draggedIndex === masterIndex ? 'opacity-40 bg-blue-50/50' : 'opacity-100'}`}
                        >
                          {/* 1. Visual Position Number (序位) */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-mono text-xs font-bold ${
                              product.isPinned 
                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/10' 
                                : displayRank <= 3 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-100 text-slate-500'
                            }`} id={`rank-badge-${product.code}`}>
                              {displayRank}
                            </span>
                          </td>

                          {/* 2. Drag handle (拖拽) */}
                          <td className="py-2 px-1 text-center">
                            {(!searchQuery && filter === 'all') ? (
                              <div 
                                className="cursor-grab text-gray-300 hover:text-slate-600 active:cursor-grabbing p-1.5 inline-flex rounded"
                                title="上下拖拽换位"
                                id={`drag-handle-${product.code}`}
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="p-1.5 inline-flex text-gray-200" title="过滤模式下禁止拖动排序">
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>

                          {/* 3. Product Code (产品代码) */}
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-500 select-all">
                            {product.code}
                          </td>

                          {/* 4. Product Name (产品名称) with Pin badge */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {product.isPinned && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white select-none">
                                  <Pin className="w-2.5 h-2.5 fill-white" />
                                  置顶
                                </span>
                              )}
                              <span className={`text-[13.5px] font-medium leading-relaxed ${
                                product.status === 'offline' 
                                  ? 'text-slate-400 line-through decoration-gray-300' 
                                  : 'text-slate-900 group-hover:text-blue-700'
                              }`}>
                                {product.name}
                              </span>
                            </div>
                          </td>

                          {/* 5. Category (投资类型) */}
                          <td className="py-3 px-4 text-xs">
                            <span className="text-slate-600 font-medium">
                              {product.category}
                            </span>
                          </td>

                          {/* 6. Manager (投资经理) */}
                          <td className="py-3 px-3 text-xs text-slate-500">
                            {product.manager}
                          </td>

                          {/* 7. Net Asset Value (最新单位净值) */}
                          <td className="py-3 px-4 font-mono text-xs text-right text-slate-700">
                            {product.netValue.toFixed(4)}
                          </td>

                          {/* 8. Growth Rate (折算日涨跌) */}
                          <td className={`py-3 px-4 font-mono text-xs text-right font-medium ${
                            product.growthRate >= 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            {product.growthRate >= 0 ? `+${product.growthRate.toFixed(2)}%` : `${product.growthRate.toFixed(2)}%`}
                          </td>

                          {/* 9. Interactive Positioning Controller (人工排序修改) */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center" id={`sort-actions-${product.code}`}>
                              {/* Short arrow Up */}
                              <button
                                onClick={() => handleStepwiseMove(product.id, 'up')}
                                disabled={masterIndex === 0}
                                className="p-1 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-gray-200 rounded disabled:opacity-30 disabled:hover:bg-white cursor-pointer transition-colors"
                                title="上移一位"
                                id={`btn-move-up-${product.code}`}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>

                              {/* Manual Input field for absolute index snapping */}
                              <div className="relative flex items-center">
                                <span className="absolute left-1.5 text-[9px] font-semibold text-slate-400 select-none font-mono">№</span>
                                <input
                                  type="text"
                                  value={displayRank}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value.replace(/\D/g, ''), 10);
                                    if (!isNaN(val)) {
                                      handleReorderIndex(product.id, val);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // ensure fallback to correct rank value on blur
                                    e.target.value = displayRank.toString();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = parseInt((e.target as HTMLInputElement).value.replace(/\D/g, ''), 10);
                                      if (!isNaN(val)) {
                                        handleReorderIndex(product.id, val);
                                      }
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="w-[52px] h-[26px] pl-4 pr-1 text-center font-mono text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded bg-slate-50/50"
                                  title="输入欲放序号，按回车键直接插队对齐"
                                  id={`input-order-${product.code}`}
                                />
                              </div>

                              {/* Short arrow Down */}
                              <button
                                onClick={() => handleStepwiseMove(product.id, 'down')}
                                disabled={masterIndex === products.length - 1}
                                className="p-1 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-gray-200 rounded disabled:opacity-30 disabled:hover:bg-white cursor-pointer transition-colors"
                                title="下移一位"
                                id={`btn-move-down-${product.code}`}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Pin Toggle icon item */}
                              <button
                                onClick={() => handleTogglePin(product.id)}
                                className={`p-1.5 border rounded cursor-pointer transition-colors ${
                                  product.isPinned 
                                    ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600' 
                                    : 'bg-white text-slate-400 hover:text-amber-500 border-gray-200 hover:border-amber-200'
                                }`}
                                title={product.isPinned ? "取消锁定" : "设为顶置核心特配产品"}
                                id={`btn-pin-${product.code}`}
                              >
                                <Pin className={`w-3.5 h-3.5 ${product.isPinned ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                          </td>

                          {/* 10. Normal Status Action: Online / Offline (操作: 下线 / 上线) */}
                          <td className="py-2 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(product.id)}
                              className={`w-full py-1 px-3 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                                product.status === 'online'
                                  ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100 hover:text-rose-800'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                              id={`btn-status-toggle-${product.code}`}
                            >
                              {product.status === 'online' ? '下线' : '上线'}
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer Info of table listing */}
          <div className="p-4 px-5 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>拖拽与直输序号操作均会<b>实时重算并保存</b>其他产品的相对席位。</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="font-medium">表格指示：</span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-amber-50 text-amber-500 rounded border border-amber-200 inline-block" /> 核心置顶特推区
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-white rounded border border-gray-200 inline-block" /> 常规产品专区
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Trigger Modal Form popup */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddProduct}
        existingCodes={existingCodes}
      />
    </div>
  );
}

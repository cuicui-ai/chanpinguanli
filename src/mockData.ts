import { Product } from './types';

// Programmatically generate 50 financial products to ensure realistic data volume
export const generateDefaultProducts = (): Product[] => {
  const categories = ["固定收益 (+)", "量化混合", "权益增强", "多资产对冲"];
  const managers = ["张博雅", "李宏威", "王泽宇", "赵雪婷", "刘一帆"];

  return Array.from({ length: 50 }, (_, i) => {
    const sequenceNum = i + 1;
    // Generate code matching the photo pattern: 111111, 111112 ...
    const code = (111110 + sequenceNum).toString();
    const isOffline = sequenceNum % 9 === 0 || sequenceNum === 17 || sequenceNum === 35; // a few offline examples
    
    // Choose realistic managers and values
    const category = categories[i % categories.length];
    const manager = managers[i % managers.length];
    const netValue = parseFloat((1.0125 + (i * 0.0075) - (i % 3 === 0 ? 0.02 : 0)).toFixed(4));
    const growthRate = parseFloat((((i % 7) * 2.15) - (i % 5 === 0 ? 3.4 : 1.2)).toFixed(2));

    return {
      id: `prod_${code}`,
      code,
      name: `特发专户混合型产品${sequenceNum}号`,
      status: isOffline ? 'offline' : 'online',
      isPinned: sequenceNum <= 3, // Enable 3 default pins to illustrate the ranking mechanism
      sortOrder: sequenceNum,
      category,
      manager,
      netValue,
      growthRate,
      createdAt: new Date(Date.now() - i * 7200000).toISOString()
    };
  });
};

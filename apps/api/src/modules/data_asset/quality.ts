/**
 * 数据资产质量评估引擎 (Data Asset Quality Profiler Engine)
 *
 * 遵循严格 Zero-Fake-Data 策略：
 * - 完整度 (Completeness): 基于字段中文描述率、显示名配置率及维度定义
 * - 鲜活度 (Freshness): 基于数据资产最近更新时间与当前时间的衰减函数
 * - 规范度 (Validity): 基于 SQL 标准数据类型合规率与行数有效性
 * - 综合健康分 (Health Score): 0 - 100 确定性加权计算
 * - 质量评级 (Grade): A+ / A / B / C / D
 */

export interface ColumnQualityProfile {
  id: number;
  name: string;
  displayName: string | null;
  dataType: string;
  isDimension: boolean;
  hasDescription: boolean;
  qualityStatus: 'GOOD' | 'WARNING' | 'CRITICAL';
  issueDescription?: string;
}

export interface TableQualityProfile {
  tableId: number;
  tableName: string;
  displayName: string | null;
  tableType: string;
  healthScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  completenessScore: number;
  freshnessScore: number;
  validityScore: number;
  rowCount: number;
  columnCount: number;
  updatedAt: string;
  anomalies: string[];
  columns: ColumnQualityProfile[];
}

export interface ProjectQualityOverview {
  projectId: number;
  totalTables: number;
  totalColumns: number;
  avgHealthScore: number;
  gradeDistribution: {
    'A+': number;
    A: number;
    B: number;
    C: number;
    D: number;
  };
  healthyTableCount: number;
  atRiskTableCount: number;
  topAnomalies: { issue: string; count: number }[];
  tables: Array<Omit<TableQualityProfile, 'columns'>>;
  evaluatedAt: string;
}

const VALID_DATA_TYPES = new Set([
  'varchar',
  'char',
  'text',
  'string',
  'int',
  'integer',
  'bigint',
  'smallint',
  'tinyint',
  'float',
  'double',
  'decimal',
  'numeric',
  'number',
  'boolean',
  'bool',
  'date',
  'datetime',
  'timestamp',
  'json',
  'array',
]);

/**
 * 计算单张数据表的质量概况
 */
export function calculateTableQuality(
  table: {
    id: number;
    name: string;
    display_name?: string | null;
    type: string;
    row_count?: number | null;
    updated_at?: Date | string | null;
    created_at?: Date | string | null;
  },
  columns: Array<{
    id: number;
    name: string;
    display_name?: string | null;
    data_type: string;
    is_dimension?: boolean | null;
    description?: string | null;
  }>,
  now: Date = new Date(),
): TableQualityProfile {
  const totalCols = columns.length;
  const rowCount = table.row_count ?? 0;
  const anomalies: string[] = [];

  // 1. 字段级评级
  const columnProfiles: ColumnQualityProfile[] = columns.map((col) => {
    const hasDesc = Boolean(col.description && col.description.trim().length > 0);
    const hasName = Boolean(col.display_name && col.display_name.trim().length > 0);
    const isValidType = VALID_DATA_TYPES.has(col.data_type.toLowerCase());

    let qualityStatus: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';
    let issueDescription: string | undefined;

    if (!isValidType) {
      qualityStatus = 'CRITICAL';
      issueDescription = `非法或非标数据类型: ${col.data_type}`;
    } else if (!hasDesc && !hasName) {
      qualityStatus = 'WARNING';
      issueDescription = '缺少显示名与中文注释说明';
    } else if (!hasDesc) {
      qualityStatus = 'WARNING';
      issueDescription = '缺少字段业务描述';
    }

    return {
      id: col.id,
      name: col.name,
      displayName: col.display_name ?? null,
      dataType: col.data_type,
      isDimension: Boolean(col.is_dimension),
      hasDescription: hasDesc,
      qualityStatus,
      issueDescription,
    };
  });

  // 2. 完整度得分 (Completeness Score)
  let completenessScore = 100;
  if (totalCols === 0) {
    completenessScore = 40;
    anomalies.push('数据表缺少字段元数据定义');
  } else {
    const describedCols = columns.filter(
      (c) => c.description && c.description.trim().length > 0,
    ).length;
    const namedCols = columns.filter(
      (c) => c.display_name && c.display_name.trim().length > 0,
    ).length;
    const hasDimension = columns.some((c) => Boolean(c.is_dimension));

    const descRatio = describedCols / totalCols;
    const nameRatio = namedCols / totalCols;
    const dimScore = hasDimension ? 1 : 0.6;

    completenessScore = Math.round((descRatio * 0.45 + nameRatio * 0.35 + dimScore * 0.2) * 100);

    if (describedCols < totalCols) {
      anomalies.push(`${totalCols - describedCols} 个字段缺少中文业务描述`);
    }
    if (!hasDimension) {
      anomalies.push('未指定任何维度属性字段');
    }
  }

  // 3. 鲜活度得分 (Freshness Score)
  const lastUpdated = new Date(table.updated_at || table.created_at || now);
  const diffMs = Math.max(0, now.getTime() - lastUpdated.getTime());
  const diffDays = diffMs / (1000 * 3600 * 24);

  let freshnessScore = 100;
  if (diffDays <= 1) {
    freshnessScore = 100;
  } else if (diffDays <= 7) {
    freshnessScore = 90;
  } else if (diffDays <= 30) {
    freshnessScore = 75;
  } else if (diffDays <= 90) {
    freshnessScore = 55;
    anomalies.push(`数据表超过 ${Math.floor(diffDays)} 天未更新维护`);
  } else {
    freshnessScore = 30;
    anomalies.push(`数据表陈旧：超过 ${Math.floor(diffDays)} 天未更新`);
  }

  // 4. 规范度得分 (Validity Score)
  let validityScore = 100;
  if (totalCols > 0) {
    const validTypeCount = columns.filter((c) =>
      VALID_DATA_TYPES.has(c.data_type.toLowerCase()),
    ).length;
    const typeRatio = validTypeCount / totalCols;
    const rowRatio = rowCount > 0 ? 1 : 0.6;
    validityScore = Math.round((typeRatio * 0.6 + rowRatio * 0.4) * 100);

    if (rowCount === 0) {
      anomalies.push('数据表行数为 0 (空表)');
    }
    if (validTypeCount < totalCols) {
      anomalies.push(`${totalCols - validTypeCount} 个字段使用了非标 SQL 类型`);
    }
  } else {
    validityScore = rowCount > 0 ? 70 : 40;
    if (rowCount === 0) {
      anomalies.push('数据表行数为 0 (空表)');
    }
  }

  // 5. 综合健康分 (Health Score)
  const healthScore = Math.round(
    completenessScore * 0.35 + freshnessScore * 0.35 + validityScore * 0.3,
  );

  // 6. 评级 (Grade)
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  if (healthScore >= 90) grade = 'A+';
  else if (healthScore >= 80) grade = 'A';
  else if (healthScore >= 70) grade = 'B';
  else if (healthScore >= 60) grade = 'C';
  else grade = 'D';

  return {
    tableId: table.id,
    tableName: table.name,
    displayName: table.display_name ?? null,
    tableType: table.type,
    healthScore,
    grade,
    completenessScore,
    freshnessScore,
    validityScore,
    rowCount,
    columnCount: totalCols,
    updatedAt: lastUpdated.toISOString(),
    anomalies,
    columns: columnProfiles,
  };
}

/**
 * 汇总项目整体数据质量报告
 */
export function calculateProjectQualityOverview(
  projectId: number,
  tablesWithColumns: Array<{
    id: number;
    name: string;
    display_name?: string | null;
    type: string;
    row_count?: number | null;
    updated_at?: Date | string | null;
    created_at?: Date | string | null;
    columns: Array<{
      id: number;
      name: string;
      display_name?: string | null;
      data_type: string;
      is_dimension?: boolean | null;
      description?: string | null;
    }>;
  }>,
  now: Date = new Date(),
): ProjectQualityOverview {
  const tableProfiles = tablesWithColumns.map((t) => calculateTableQuality(t, t.columns, now));

  const totalTables = tableProfiles.length;
  const totalColumns = tablesWithColumns.reduce((acc, t) => acc + (t.columns?.length || 0), 0);

  const gradeDistribution: ProjectQualityOverview['gradeDistribution'] = {
    'A+': 0,
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  };

  const anomalyCounter = new Map<string, number>();

  let sumHealth = 0;
  let healthyTableCount = 0;
  let atRiskTableCount = 0;

  for (const prof of tableProfiles) {
    sumHealth += prof.healthScore;
    gradeDistribution[prof.grade] = (gradeDistribution[prof.grade] || 0) + 1;

    if (prof.healthScore >= 80) healthyTableCount++;
    if (prof.healthScore < 70) atRiskTableCount++;

    for (const anom of prof.anomalies) {
      anomalyCounter.set(anom, (anomalyCounter.get(anom) || 0) + 1);
    }
  }

  const avgHealthScore = totalTables > 0 ? Math.round(sumHealth / totalTables) : 100;

  const topAnomalies = Array.from(anomalyCounter.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const tableSummaries = tableProfiles.map(({ columns, ...rest }) => rest);

  return {
    projectId,
    totalTables,
    totalColumns,
    avgHealthScore,
    gradeDistribution,
    healthyTableCount,
    atRiskTableCount,
    topAnomalies,
    tables: tableSummaries,
    evaluatedAt: now.toISOString(),
  };
}

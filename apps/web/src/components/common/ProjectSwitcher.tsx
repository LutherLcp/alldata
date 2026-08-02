/**
 * 项目切换器组件
 */
import { useEffect } from 'react';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { useGlobalStore } from '@/stores/global';

export function ProjectSwitcher() {
  const { t } = useTranslation();
  const { userInfo } = useAuthStore();
  const { currentProject, projects, setCurrentProject, setProjects } = useGlobalStore();

  // 从 userInfo 中初始化项目列表 (带默认项目 1 兜底)
  useEffect(() => {
    const list = (userInfo?.projects && userInfo.projects.length > 0)
      ? userInfo.projects
      : [{ id: 1, code: 'default', name: '全域电商主项目' }];
    setProjects(list);
    if (!currentProject && list[0]) {
      setCurrentProject(list[0]);
    }
  }, [userInfo, currentProject, setProjects, setCurrentProject]);

  const handleChange = (value: number) => {
    const project = projects.find((p) => p.id === value);
    if (project) setCurrentProject(project);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Select
        value={currentProject?.id}
        onChange={handleChange}
        placeholder={t('project.selectProject')}
        style={{ minWidth: 160 }}
        options={projects.map((p) => ({ label: p.name, value: p.id }))}
      />
    </div>
  );
}

/**
 * 项目切换器组件
 */
import React, { useEffect } from 'react';
import { Select, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { useGlobalStore } from '@/stores/global';
import type { ProjectSimple } from '@alldata/shared/types/index.js';

export function ProjectSwitcher() {
  const { t } = useTranslation();
  const { userInfo } = useAuthStore();
  const { currentProject, projects, setCurrentProject, setProjects } = useGlobalStore();

  // 从 userInfo 中初始化项目列表
  useEffect(() => {
    if (userInfo?.projects && userInfo.projects.length > 0) {
      setProjects(userInfo.projects);
      if (!currentProject) {
        setCurrentProject(userInfo.projects[0]);
      }
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

/**
 * 无权限页面
 */
import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export function NoPowerPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面"
        extra={
          <>
            <Button type="primary" onClick={() => navigate('/')}>返回首页</Button>
            <Button onClick={() => navigate(-1)}>返回上一页</Button>
          </>
        }
      />
    </div>
  );
}

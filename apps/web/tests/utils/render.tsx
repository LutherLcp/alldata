import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lang';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

interface TestRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withRouter?: boolean;
  withQuery?: boolean;
  withI18n?: boolean;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

const AllProviders = ({
  children,
  withRouter = true,
  withQuery = true,
  withI18n = true,
  queryClient = createQueryClient(),
  initialEntries = ['/'],
}: {
  children: ReactNode;
  withRouter?: boolean;
  withQuery?: boolean;
  withI18n?: boolean;
  queryClient?: QueryClient;
  initialEntries?: string[];
}) => {
  let wrapper = children;

  if (withI18n) {
    wrapper = <I18nextProvider i18n={i18n}>{wrapper}</I18nextProvider>;
  }

  if (withQuery) {
    wrapper = <QueryClientProvider client={queryClient}>{wrapper}</QueryClientProvider>;
  }

  if (withRouter) {
    wrapper = <BrowserRouter initialEntries={initialEntries}>{wrapper}</BrowserRouter>;
  }

  return wrapper;
};

export const renderWithProviders = (
  ui: ReactElement,
  options: TestRenderOptions = {}
) => {
  const {
    withRouter = true,
    withQuery = true,
    withI18n = true,
    queryClient = createQueryClient(),
    initialEntries = ['/'],
    ...renderOptions
  } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders
        withRouter={withRouter}
        withQuery={withQuery}
        withI18n={withI18n}
        queryClient={queryClient}
        initialEntries={initialEntries}
      >
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
};

export * from '@testing-library/react';
export { renderWithProviders as render };
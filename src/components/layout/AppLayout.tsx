import { Outlet, ScrollRestoration } from 'react-router'
import { StorageWarning } from '../common/StorageWarning'
import { Header } from './Header'
import { PageContainer } from './PageContainer'

export function AppLayout() {
  return (
    <>
      <Header />
      <PageContainer>
        <StorageWarning />
        <Outlet />
      </PageContainer>
      {/* New pages start at the top instead of keeping the old scroll. */}
      <ScrollRestoration />
    </>
  )
}

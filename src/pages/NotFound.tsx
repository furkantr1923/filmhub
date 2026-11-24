import { Page } from '../components/Layout';
import { Button, EmptyState } from '../components/ui';
import { navigate } from '../router/router';

export default function NotFound() {
  return (
    <Page className="pt-24 lg:pt-12">
      <EmptyState icon="compass" title="Sayfa bulunamadı" text="Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir."
        action={<Button variant="primary" icon="home" onClick={() => navigate('/')}>Ana sayfaya dön</Button>} />
    </Page>
  );
}

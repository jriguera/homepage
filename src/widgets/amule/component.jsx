import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import { useTranslation } from "next-i18next";
import useWidgetAPI from "utils/proxy/use-widget-api";

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;

  const { data: statsData, error: statsError } = useWidgetAPI(widget);

  if (statsError) {
    return <Container service={service} error={statsError} />;
  }

  if (!statsData) {
    return (
      <Container service={service}>
        <Block label="amule.download" />
        <Block label="amule.upload" />
        <Block label="amule.downloading" />
        <Block label="amule.queue" />
      </Container>
    );
  }

  return (
    <Container service={service}>
      <Block label="amule.download" value={t("common.bitrate", { value: statsData.download_speed })} />
      <Block label="amule.upload" value={t("common.bitrate", { value: statsData.upload_speed })} />
      <Block label="amule.downloading" value={t("common.number", { value: statsData.downloading })} />
      <Block label="amule.queue" value={t("common.number", { value: statsData.queue })} />
    </Container>
  );
}

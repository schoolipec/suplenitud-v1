"use client";

import {Button, Group, Stack, Badge, Card, SimpleGrid, Text, Alert} from "@mantine/core";
import {IconChartBar, IconGlobe, IconMapPin, IconUsers} from "@tabler/icons-react";

export type VisitsAggregate = {
  pageViews: number;
  uniqueSessions: number;
  fromInput: string;
  toInput: string;
  geoAvailable: boolean;
  topPages: {label: string; count: number}[];
  countries: {label: string; count: number}[];
  usStates: {label: string; count: number}[];
  locales: {label: string; count: number}[];
  devices: {label: string; count: number}[];
  referrers: {label: string; count: number}[];
};

function Section({title, rows, empty}: {title: string; rows: {label: string; count: number}[]; empty: string}) {
  return (
    <Stack gap="md">
      <h3 style={{margin: 0}}>{title}</h3>
      {rows.length === 0 ? (
        <Alert color="gray" title={empty} />
      ) : (
        <Stack gap="xs">
          {rows.map((row) => (
            <Group key={row.label} justify="space-between" p="xs" style={{borderBottom: "1px solid var(--line)"}}>
              <Text>{row.label}</Text>
              <Badge variant="dot">{row.count} {row.count === 1 ? "visit" : "visits"}</Badge>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function VisitsDashboard({data}: {data: VisitsAggregate}) {
  return (
    <Stack gap="lg">
      <Alert title="Privacy First" color="blue">
        Public visits only. Admin pages, APIs, internal routes, bots and signed-in sessions are never counted. Records stay aggregate: no IPs, no profiles, no precise locations.
      </Alert>

      <form method="get" action="/admin/visits">
        <Group gap="md" mb="md">
          <Group gap="xs">
            <label htmlFor="visits-from" style={{fontWeight: 500}}>From</label>
            <input id="visits-from" type="date" name="from" defaultValue={data.fromInput} max={data.toInput} style={{padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "4px"}} />
          </Group>
          <Group gap="xs">
            <label htmlFor="visits-to" style={{fontWeight: 500}}>To</label>
            <input id="visits-to" type="date" name="to" defaultValue={data.toInput} max={data.toInput} style={{padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "4px"}} />
          </Group>
          <Button type="submit" variant="outline" size="sm">
            Apply range
          </Button>
          <Badge color={data.geoAvailable ? "green" : "gray"}>
            {data.geoAvailable ? "Geography: GeoLite2 active" : "Geography unavailable"}
          </Badge>
        </Group>
      </form>

      <SimpleGrid cols={{base: 1, sm: 2, md: 4}} spacing="md">
        <Card p="md" radius="md" style={{border: "1px solid var(--line)"}}>
          <Group justify="space-between" mb="xs">
            <IconChartBar size={22} stroke={1.75} color="var(--green)" />
            <Text size="sm" fw={500}>Page views</Text>
          </Group>
          <Text size="xl" fw={700}>{data.pageViews}</Text>
          <Text size="xs" color="dimmed" mt="xs">Public pages in range</Text>
        </Card>

        <Card p="md" radius="md" style={{border: "1px solid var(--line)"}}>
          <Group justify="space-between" mb="xs">
            <IconUsers size={22} stroke={1.75} color="var(--green)" />
            <Text size="sm" fw={500}>Unique sessions</Text>
          </Group>
          <Text size="xl" fw={700}>{data.uniqueSessions}</Text>
          <Text size="xs" color="dimmed" mt="xs">Anonymous visitors</Text>
        </Card>

        <Card p="md" radius="md" style={{border: "1px solid var(--line)"}}>
          <Group justify="space-between" mb="xs">
            <IconGlobe size={22} stroke={1.75} color="var(--green)" />
            <Text size="sm" fw={500}>Countries</Text>
          </Group>
          <Text size="xl" fw={700}>{data.countries.length}</Text>
          <Text size="xs" color="dimmed" mt="xs">With identified origin</Text>
        </Card>

        <Card p="md" radius="md" style={{border: "1px solid var(--line)"}}>
          <Group justify="space-between" mb="xs">
            <IconMapPin size={22} stroke={1.75} color="var(--green)" />
            <Text size="sm" fw={500}>US states</Text>
          </Group>
          <Text size="xl" fw={700}>{data.usStates.length}</Text>
          <Text size="xs" color="dimmed" mt="xs">States with visits</Text>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{base: 1, md: 2}} spacing="lg">
        <Section title="Top pages" rows={data.topPages} empty="No public page views in this range." />
        <Section
          title="Top countries"
          rows={data.countries}
          empty={data.geoAvailable ? "No identified origins in this range." : "Geography unavailable: configure GeoLite2."}
        />
        <Section
          title="US states"
          rows={data.usStates}
          empty={data.geoAvailable ? "No US state visits in this range." : "Geography unavailable: configure GeoLite2."}
        />
        <Section title="Languages" rows={data.locales} empty="No visits in this range." />
        <Section title="Devices" rows={data.devices} empty="No visits in this range." />
        <Section title="Referrers" rows={data.referrers} empty="No external referrers in this range." />
      </SimpleGrid>
    </Stack>
  );
}

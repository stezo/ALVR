#pragma once

#include <openvr_driver.h>
#include "Logger.h"

class TrackingReference : public vr::ITrackedDeviceServerDriver
{
public:
	//
	// ITrackedDeviceServerDriver
	//

	virtual vr::EVRInitError Activate(vr::TrackedDeviceIndex_t unObjectId)
	{
		Log(L"TrackingReference::Activate. objectId=%d", unObjectId);

		mObjectId = unObjectId;
		mPropertyContainer = vr::VRProperties()->TrackedDeviceToPropertyContainer(mObjectId);

		vr::VRProperties()->SetStringProperty(mPropertyContainer, vr::Prop_ModelNumber_String, "TrackingReference-Model001");
		vr::VRProperties()->SetStringProperty(mPropertyContainer, vr::Prop_RenderModelName_String, "TrackingReference-Model001");

		vr::VRProperties()->SetStringProperty(mPropertyContainer, vr::Prop_AttachedDeviceId_String, GetSerialNumber().c_str());

		return vr::VRInitError_None;
	}

	virtual void Deactivate()
	{
		Log(L"TrackingReference::Deactivate");
		mObjectId = vr::k_unTrackedDeviceIndexInvalid;
	}

	virtual void EnterStandby()
	{
	}

	void *GetComponent(const char *pchComponentNameAndVersion)
	{
		Log(L"TrackingReference::GetComponent. Name=%hs", pchComponentNameAndVersion);

		return NULL;
	}

	virtual void PowerOff()
	{
	}

	/** debug request from a client */
	virtual void DebugRequest(const char *pchRequest, char *pchResponseBuffer, uint32_t unResponseBufferSize)
	{
		if (unResponseBufferSize >= 1)
			pchResponseBuffer[0] = 0;
	}

	virtual vr::DriverPose_t GetPose()
	{
		vr::DriverPose_t pose = { 0 };
		pose.poseIsValid = true;
		pose.result = vr::TrackingResult_Running_OK;
		pose.deviceIsConnected = true;

		pose.qWorldFromDriverRotation = HmdQuaternion_Init(1, 0, 0, 0);
		pose.qDriverFromHeadRotation = HmdQuaternion_Init(1, 0, 0, 0);
		pose.qRotation = HmdQuaternion_Init(1, 0, 0, 0);

		return pose;
	}

	std::string GetSerialNumber() {
		return "ALVR-TrackingReference001";
	}

	void OnPoseUpdated()
	{
		vr::VRServerDriverHost()->TrackedDevicePoseUpdated(mObjectId, GetPose(), sizeof(vr::DriverPose_t));
	}

private:
	vr::TrackedDeviceIndex_t mObjectId;
	vr::PropertyContainerHandle_t mPropertyContainer;
};